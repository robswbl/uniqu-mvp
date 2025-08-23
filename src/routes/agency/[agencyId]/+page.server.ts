// src/routes/agency/[agencyId]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return {
		agencyId: params.agencyId
	};
};
