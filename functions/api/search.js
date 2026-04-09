// 🔥 最终完美版：标准 SearXNG API 格式，完美适配 OpenClaw
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || '';
  const format = searchParams.get('format') || 'json';

  // 🔧 标准 SearXNG API 必须支持的参数
  const count = parseInt(searchParams.get('count') || '10', 10);

  if (!q) {
    return Response.json({
      query: q,
      number_of_results: 0,
      results: [],
      answers: [],
      infoboxes: [],
      suggestions: []
    });
  }

  try {
    // DuckDuckGo 搜索 API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const data = await res.json();
    const results = [];

    // 解析 DDG 结果，适配标准 SearXNG 格式
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics.slice(0, count)) {
        if (item.FirstURL && item.Text) {
          const splitIndex = item.Text.indexOf(' - ');
          let title, content;
          
          if (splitIndex !== -1) {
            title = item.Text.slice(0, splitIndex).trim();
            content = item.Text.slice(splitIndex + 3).trim();
          } else {
            title = item.Text.trim();
            content = "无详细摘要";
          }

          // 🔧 标准 SearXNG 结果字段
          results.push({
            title: title,
            url: item.FirstURL,
            content: content,
            engine: "duckduckgo",
            category: "general"
          });
        }
      }
    }

    // 🔧 标准 SearXNG API 响应格式（OpenClaw 原生支持）
    const response = {
      query: q,
      number_of_results: results.length,
      results: results,
      answers: [],
      infoboxes: data.Infobox ? [data.Infobox] : [],
      suggestions: data.RelatedTopics ? data.RelatedTopics.map(t => t.Text.split(' - ')[0]).slice(0, 5) : []
    };

    if (format === 'json') {
      return new Response(JSON.stringify(response, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // 网页端展示
    return new Response(`
      <html><head><meta charset="UTF-8"><title>搜索结果: ${q}</title></head><body>
        <h1>搜索结果 (DuckDuckGo)</h1>
        ${results.map(r => `
          <div style="margin: 15px 0; padding: 10px; border-bottom: 1px solid #eee;">
            <h3><a href="${r.url}" target="_blank">${r.title}</a></h3>
            <p>${r.content}</p>
          </div>
        `).join('')}
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } catch (err) {
    return Response.json({ error: "搜索失败", detail: err + "" }, { status: 500 });
  }
}
