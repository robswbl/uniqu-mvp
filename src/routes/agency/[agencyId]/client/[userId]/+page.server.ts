// src/routes/agency/[agencyId]/client/[userId]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return {
		agencyId: params.agencyId,
		userId: params.userId
	};
};
