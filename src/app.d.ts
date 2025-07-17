// src/app.d.ts

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	
	// Add this part to define your environment variables
	interface ImportMetaEnv {
		readonly VITE_SUPABASE_URL: string;
		readonly VITE_SUPABASE_ANON_KEY: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};