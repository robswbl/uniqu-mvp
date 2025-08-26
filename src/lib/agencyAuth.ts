import { supabase } from './supabaseClient';

export interface AgencyUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	agencyId: string;
	agencyName: string;
	role: string;
	permissions: any;
}

export interface AgencySession {
	token: string;
	user: AgencyUser;
	expiresAt: string;
}

/**
 * Get the current agency session from localStorage
 */
export function getAgencySession(): AgencySession | null {
	if (typeof window === 'undefined') return null;
	
	try {
		const sessionData = localStorage.getItem('agencySession');
		if (!sessionData) return null;
		
		const session: AgencySession = JSON.parse(sessionData);
		
		// Check if session has expired
		if (new Date(session.expiresAt) < new Date()) {
			localStorage.removeItem('agencySession');
			return null;
		}
		
		return session;
	} catch (error) {
		console.error('Error parsing agency session:', error);
		localStorage.removeItem('agencySession');
		return null;
	}
}

/**
 * Validate agency session against the database
 */
export async function validateAgencySession(session: AgencySession): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from('agency_sessions')
			.select('id, is_active, expires_at')
			.eq('session_token', session.token)
			.eq('agency_user_id', session.user.id)
			.eq('is_active', true)
			.single();

		if (error || !data) return false;
		
		// Check if session has expired
		if (new Date(data.expires_at) < new Date()) {
			// Mark session as inactive
			await supabase
				.from('agency_sessions')
				.update({ is_active: false })
				.eq('id', data.id);
			return false;
		}
		
		return true;
	} catch (error) {
		console.error('Error validating agency session:', error);
		return false;
	}
}

/**
 * Clear agency session (logout)
 */
export async function clearAgencySession(session: AgencySession): Promise<void> {
	try {
		// Mark session as inactive in database
		await supabase
			.from('agency_sessions')
			.update({ is_active: false })
			.eq('session_token', session.token);
	} catch (error) {
		console.error('Error clearing agency session:', error);
	} finally {
		// Remove from localStorage
		if (typeof window !== 'undefined') {
			localStorage.removeItem('agencySession');
		}
	}
}

/**
 * Check if user has specific permission
 */
export function hasPermission(session: AgencySession | null, permission: string): boolean {
	if (!session || !session.user.permissions) return false;
	
	const permissions = session.user.permissions;
	
	// Check for admin role (has all permissions)
	if (permissions.all === true) return true;
	
	// Check specific permission
	const permissionParts = permission.split('.');
	let currentLevel = permissions;
	
	for (const part of permissionParts) {
		if (currentLevel[part] === undefined) return false;
		currentLevel = currentLevel[part];
	}
	
	return currentLevel === true;
}

/**
 * Check if user can access a specific agency
 */
export function canAccessAgency(session: AgencySession | null, agencyId: string): boolean {
	if (!session) return false;
	return session.user.agencyId === agencyId;
}

/**
 * Refresh agency session data from database
 */
export async function refreshAgencySession(session: AgencySession): Promise<AgencySession | null> {
	try {
		const { data: userData, error: userError } = await supabase
			.from('agency_users')
			.select(`
				*,
				agencies!agency_id (
					id,
					name,
					agency_type
				),
				agency_user_roles!role_id (
					id,
					name,
					permissions
				)
			`)
			.eq('id', session.user.id)
			.eq('is_active', true)
			.single();

		if (userError || !userData) return null;

		const updatedSession: AgencySession = {
			...session,
			user: {
				id: userData.id,
				email: userData.email,
				firstName: userData.first_name,
				lastName: userData.last_name,
				agencyId: userData.agency_id,
				agencyName: userData.agencies?.name,
				role: userData.agency_user_roles?.name,
				permissions: userData.agency_user_roles?.permissions
			}
		};

		// Update localStorage
		if (typeof window !== 'undefined') {
			localStorage.setItem('agencySession', JSON.stringify(updatedSession));
		}

		return updatedSession;
	} catch (error) {
		console.error('Error refreshing agency session:', error);
		return null;
	}
}

/**
 * Create a new agency session
 */
export async function createAgencySession(userId: string, userAgent?: string, ipAddress?: string): Promise<string | null> {
	try {
		const sessionToken = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

		const { error } = await supabase
			.from('agency_sessions')
			.insert({
				agency_user_id: userId,
				session_token: sessionToken,
				expires_at: expiresAt.toISOString(),
				ip_address: ipAddress || '127.0.0.1',
				user_agent: userAgent || 'Unknown'
			});

		if (error) {
			console.error('Error creating agency session:', error);
			return null;
		}

		return sessionToken;
	} catch (error) {
		console.error('Error creating agency session:', error);
		return null;
	}
}
