<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';
  
    let userEmail = '';
    let isLoading = false;
    let feedbackMessage = '';
  
    async function handleStart() {
      if (!userEmail) {
        alert('Please enter your email address.');
        return;
      }
      isLoading = true;
      feedbackMessage = '';
  
      try {
        // 🔄 DIRECT DATABASE APPROACH (No RPC function)
        
        // 1. Find the user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_uuid')
          .eq('user_email', userEmail)
          .single();
  
        if (userError || !userData) {
          throw new Error(`User with email ${userEmail} not found`);
        }
  
        // 2. Find their session
        const { data: sessionData, error: sessionError } = await supabase
          .from('questionnaire_sessions')
          .select('id, status')
          .eq('user_id', userData.user_uuid)
          .single();
  
        let sessionId, sessionStatus;
  
        if (sessionError && sessionError.code === 'PGRST116') {
          // No session exists - create one
          const { data: newSession, error: createError } = await supabase
            .from('questionnaire_sessions')
            .insert({
              user_id: userData.user_uuid,
              status: 'in-progress'
            })
            .select('id, status')
            .single();
  
          if (createError) throw createError;
          
          sessionId = newSession.id;
          sessionStatus = newSession.status;
        } else if (sessionError) {
          throw sessionError;
        } else {
          // Session exists
          sessionId = sessionData.id;
          sessionStatus = sessionData.status;
        }
  
        console.log('Session info:', { sessionId, sessionStatus });
  
        // 🚀 SMART ROUTING LOGIC
        if (sessionStatus === 'completed') {
          feedbackMessage = 'Welcome back! Taking you to your results...';
          setTimeout(async () => {
            await goto(`/results/${sessionId}`);
          }, 1500);
        } else {
          feedbackMessage = sessionStatus === 'in-progress' 
            ? 'Resuming your questionnaire...'
            : 'Starting your journey...';
          setTimeout(async () => {
            await goto(`/questionnaire/${sessionId}`);
          }, 1000);
        }
  
      } catch (e) {
        let message = 'An unknown error occurred.';
        if (e instanceof Error) {
          message = e.message;
        }
        console.error('Full error:', e);
        feedbackMessage = `Error: ${message}`;
      } finally {
        isLoading = false;
      }
    }
  </script>
  
  <div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-800">UniqU</h1>
        <p class="mt-2 text-gray-600">Enter your email to begin your journey.</p>
      </div>
  
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleStart}>
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            bind:value={userEmail}
            id="email"
            name="email"
            type="email"
            required
            class="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            placeholder="Email address"
            disabled={isLoading}
          />
        </div>
        <div>
          <button
            type="submit"
            class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading}
          >
            {#if isLoading}
              <span>Loading...</span>
            {:else}
              <span>Start</span>
            {/if}
          </button>
        </div>
      </form>
      
      {#if feedbackMessage}
        <p
          class="mt-4 text-center text-sm"
          class:text-red-500={feedbackMessage.startsWith('Error')}
          class:text-green-600={!feedbackMessage.startsWith('Error')}
        >
          {feedbackMessage}
        </p>
      {/if}
    </div>
  </div>
  
  <style lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  </style>