import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Proxy PDF request received');
    
    // Get the request body
    const requestBody = await req.json();
    console.log('Request payload:', JSON.stringify(requestBody));

    // Forward the request to the HTTP API
    const apiUrl = 'http://161.118.181.8/api/pdf';
    console.log('Forwarding to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('API response status:', response.status);

    // Check if the response is OK
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `Backend API error (${response.status})`;
      
      // Try to get error details based on content type
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse error JSON:', e);
        }
      } else {
        // For HTML or text responses
        const errorText = await response.text();
        console.error('Backend returned non-JSON error:', errorText.substring(0, 200));
        errorMessage = `Backend API returned ${response.status}: ${response.statusText}. The backend server may be down or unreachable.`;
      }

      return new Response(
        JSON.stringify({
          error: 'Backend API Error',
          message: errorMessage,
          status: response.status,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get the successful response data
    const responseData = await response.json();
    console.log('API response data received successfully');

    // Return the response with CORS headers
    return new Response(
      JSON.stringify(responseData),
      {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Proxy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        error: 'Proxy request failed',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
})
