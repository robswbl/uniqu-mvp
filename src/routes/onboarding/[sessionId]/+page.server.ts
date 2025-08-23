import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }: { params: { sessionId: string } }) => {
	return {
		sessionId: params.sessionId
	};
};
