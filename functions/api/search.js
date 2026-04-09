// 🔥 终极稳定版：Bing 国际版搜索（Cloudflare 100% 可用）
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || '';
  const format = searchParams.get('format') || 'json';

  if (!q) {
    return Response.json({ error: "请输入搜索关键词" }, { status: 400 });
  }

  try {
    // Bing 国际版 —— Cloudflare 完美访问
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}`;

    const res = await fetch(bingUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const html = await res.text();
    const results = [];

    // 稳定解析 Bing 结果
    const titleMatches = [...html.matchAll(/<h2.*?><a.*?href="(.*?)".*?>(.*?)<\/a/gs)];
    const snippetMatches = [...html.matchAll(/<p.*?>(.*?)<\/p/gs)];

    for (let i = 0; i < Math.min(8, titleMatches.length); i++) {
      const url = titleMatches[i][1] || '';
      const title = (titleMatches[i][2] || '').replace(/<[^>]+>/g, '').trim();
      const content = (snippetMatches[i]?.[1] || '').replace(/<[^>]+>/g, '').trim();

      if (title && url) {
        results.push({ title, url, content });
      }
    }

    if (format === 'json') {
      return Response.json({ query: q, results });
    }

    return new Response(`
      <h1>${q}</h1>
      ${results.map(r => `<div><h3><a href="${r.url}">${r.title}</a></h3><p>${r.content}</p></div>`).join('')}
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } catch (err) {
    return Response.json({ error: "搜索失败", detail: err + "" }, { status: 500 });
  }
}
