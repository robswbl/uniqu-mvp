// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqdflespxzoktqkkwxft.supabase.co';
const supabaseKey = 'your_anon_key_here'; // Replace with your actual key

// Primary client configured for 'uniqu' schema
export const supabase = createClient(supabaseUrl, supabaseKey, {
	db: {
		schema: 'uniqu'
	}
});

// Helper functions for your app
export async function getUsers(limit = 10) {
	const { data, error } = await supabase.from('users').select('*').limit(limit);

	if (error) throw error;
	return data;
}

export async function getUserById(id) {
	const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

	if (error) throw error;
	return data;
}

export async function createUser(userData) {
	const { data, error } = await supabase.from('users').insert(userData).select().single();

	if (error) throw error;
	return data;
}

export async function updateUser(id, updates) {
	const { data, error } = await supabase
		.from('users')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteUser(id) {
	const { error } = await supabase.from('users').delete().eq('id', id);

	if (error) throw error;
	return true;
}

// Test functions
export async function testConnection() {
	try {
		const { data, error } = await supabase.rpc('hello_world');
		if (error) throw error;
		return { success: true, message: data };
	} catch (err) {
		return { success: false, error: err.message };
	}
}

export async function testUsersTable() {
	try {
		const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact' });

		if (error) throw error;
		return { success: true, count: data[0].count };
	} catch (err) {
		return { success: false, error: err.message };
	}
}
