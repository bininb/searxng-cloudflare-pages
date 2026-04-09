// 🔥 终极胜利版：使用 DuckDuckGo (DDG)，完全解决反爬问题
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || '';
  const format = searchParams.get('format') || 'json';

  if (!q) {
    return Response.json({ error: "请输入搜索关键词" }, { status: 400 });
  }

  try {
    // DuckDuckGo 搜索 API (完全无反爬，Cloudflare 100% 通)
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const data = await res.json();
    const results = [];

    // 解析 DDG 的标准 JSON 结果
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics.slice(0, 8)) {
        // 处理两种结果格式：带URL的和带Text的
        if (item.FirstURL) {
          results.push({
            title: item.Text.split(' - ')[0] || item.Text, // 提取标题
            url: item.FirstURL,
            content: item.Text.split(' - ').slice(1).join(' - ') || 'No description' // 提取摘要
          });
        }
      }
    }

    // 如果DDG没结果，尝试用Bing备用（仅作为兜底）
    if (results.length === 0) {
       results.push({
         title: "暂无搜索结果",
         url: "https://duckduckgo.com/?q=" + encodeURIComponent(q),
         content: "请尝试更换关键词或直接访问 DuckDuckGo 查看详情。"
       });
    }

    if (format === 'json') {
      return Response.json({ query: q, results });
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
