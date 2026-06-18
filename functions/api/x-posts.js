function checkAuth(request, env) {
    const authHeader = request.headers.get("Authorization");
    return env.X_POSTS_SECRET && authHeader === `Bearer ${env.X_POSTS_SECRET}`;
}

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const postsStr = await env.X_POSTS_KV.get("posts");
        let posts = [];
        if (postsStr) {
            posts = JSON.parse(postsStr);
        } else {
            posts = [
                "https://x.com/TheSyntaxSinner/status/2067444285226819907",
                "https://x.com/TheSyntaxSinner/status/2067236343080771893",
                "https://x.com/TheSyntaxSinner/status/2066491623048098037",
                "https://x.com/TheSyntaxSinner/status/2066183539574661256"
            ];
            await env.X_POSTS_KV.put("posts", JSON.stringify(posts));
        }
        return new Response(JSON.stringify(posts), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=60"
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: "KV not configured correctly", details: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    if (!checkAuth(request, env)) return new Response("Unauthorized", { status: 401 });

    try {
        const data = await request.json();
        const url = data.url;
        if (!url || (!url.includes("x.com/") && !url.includes("twitter.com/"))) {
            return new Response("Invalid URL", { status: 400 });
        }

        const postsStr = await env.X_POSTS_KV.get("posts");
        let posts = postsStr ? JSON.parse(postsStr) : [];

        if (!posts.includes(url)) {
            posts.unshift(url);
            if (posts.length > 50) posts = posts.slice(0, 50);
            await env.X_POSTS_KV.put("posts", JSON.stringify(posts));
        }
        return new Response(JSON.stringify({ success: true, posts }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;
    if (!checkAuth(request, env)) return new Response("Unauthorized", { status: 401 });

    try {
        const data = await request.json();
        const newPosts = data.posts;
        if (!Array.isArray(newPosts)) {
            return new Response("Invalid data format. Expected an array of URLs.", { status: 400 });
        }
        
        await env.X_POSTS_KV.put("posts", JSON.stringify(newPosts));
        return new Response(JSON.stringify({ success: true, posts: newPosts }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    if (!checkAuth(request, env)) return new Response("Unauthorized", { status: 401 });

    try {
        const data = await request.json();
        const urlToRemove = data.url;
        
        const postsStr = await env.X_POSTS_KV.get("posts");
        let posts = postsStr ? JSON.parse(postsStr) : [];
        
        posts = posts.filter(url => url !== urlToRemove);
        await env.X_POSTS_KV.put("posts", JSON.stringify(posts));
        
        return new Response(JSON.stringify({ success: true, posts }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
