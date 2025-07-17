<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { supabase } from '$lib/supabaseClient';

    const sessionId = $page.params.sessionId;

    // Define the order of your results pages
    const documentOrder = ['reflection_letter', 'career_themes', 'ideal_companies'];

    onMount(async () => {
        // We just need to find the first available document type to redirect to.
        // In a real app, you might fetch all types and redirect to the first one found.
        // For now, we'll just redirect to the first one in our defined order.
        await goto(`/results/${sessionId}/${documentOrder[0]}`, { replaceState: true });
    });
</script>

<div class="flex items-center justify-center h-screen">
    <p>Loading your results...</p>
</div>