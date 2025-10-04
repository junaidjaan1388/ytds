import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import ytdl from "npm:@distube/ytdl-core@^4.15.2";

const handler = async function(req: Request) {
  const url = new URL(req.url);
  console.log(`Request: ${url.pathname}${url.search}`);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Video information endpoint
    if (url.pathname === "/vid") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(
          JSON.stringify({ error: true, message: "Missing video ID" }),
          {
            status: 400,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }

      if (ytdl.validateID(id)) {
        const yt = await ytdl.getInfo(id);
        return new Response(
          JSON.stringify({
            video: yt.player_response.videoDetails,
            stream: yt.player_response.streamingData,
            captions: yt.player_response.captions || null,
            formats: yt.formats,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      } else {
        return new Response(
          JSON.stringify({ error: true, message: "Invalid video ID" }),
          {
            status: 404,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }
    }

    // Audio formats endpoint
    else if (url.pathname === "/audio") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(
          JSON.stringify({ error: true, message: "Missing video ID" }),
          {
            status: 400,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }

      if (ytdl.validateID(id)) {
        const yt = await ytdl.getInfo(id);
        const audioFormats = ytdl.filterFormats(yt.formats, "audioonly");
        
        // Sort by quality (bitrate)
        const sortedAudio = audioFormats.sort((a, b) => {
          const bitrateA = a.audioBitrate || 0;
          const bitrateB = b.audioBitrate || 0;
          return bitrateB - bitrateA;
        });

        return new Response(
          JSON.stringify({
            audio: sortedAudio,
            videoDetails: yt.player_response.videoDetails,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      } else {
        return new Response(
          JSON.stringify({ error: true, message: "Invalid video ID" }),
          {
            status: 404,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }
    }

    // Download endpoint
    else if (url.pathname === "/download") {
      const id = url.searchParams.get("id");
      const itag = url.searchParams.get("itag");
      const type = url.searchParams.get("type") || "video";

      if (!id || !itag) {
        return new Response(
          JSON.stringify({ error: true, message: "Missing parameters" }),
          {
            status: 400,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }

      if (ytdl.validateID(id)) {
        const yt = await ytdl.getInfo(id);
        const format = yt.formats.find(f => f.itag === parseInt(itag));
        
        if (!format) {
          return new Response(
            JSON.stringify({ error: true, message: "Format not found" }),
            {
              status: 404,
              headers: {
                "content-type": "application/json; charset=utf-8",
                ...corsHeaders,
              },
            },
          );
        }

        // Get video details for filename
        const videoDetails = yt.player_response.videoDetails;
        const cleanTitle = videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const extension = type === "audio" ? 
          (format.mimeType?.includes('mp4') ? 'm4a' : 'webm') : 
          (format.mimeType?.includes('mp4') ? 'mp4' : 'webm');
        
        const filename = `${cleanTitle}.${extension}`;

        // Redirect to the actual download URL
        return new Response(
          JSON.stringify({
            url: format.url,
            filename: filename,
            title: videoDetails.title,
            quality: format.qualityLabel || `${format.audioBitrate}kbps`,
            type: type
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      } else {
        return new Response(
          JSON.stringify({ error: true, message: "Invalid video ID" }),
          {
            status: 404,
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...corsHeaders,
            },
          },
        );
      }
    }

    // Serve homepage
    else if (url.pathname === "/") {
      const index = await Deno.readTextFile("./index.html");
      return new Response(index, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...corsHeaders,
        },
      });
    }

    // Serve CSS
    else if (url.pathname === "/style.css") {
      const css = await Deno.readTextFile("./style.css");
      return new Response(css, {
        status: 200,
        headers: {
          "content-type": "text/css; charset=utf-8",
          ...corsHeaders,
        },
      });
    }

    // 404 handler
    else {
      return new Response(
        JSON.stringify({ error: true, message: "Endpoint not found" }),
        {
          status: 404,
          headers: {
            "content-type": "application/json; charset=utf-8",
            ...corsHeaders,
          },
        },
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: true, message: "Internal server error" }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...corsHeaders,
        },
      },
    );
  }
};

console.log("🚀 YouTube Downloader Server running on http://localhost:8000");
serve(handler, { port: 8000 });
