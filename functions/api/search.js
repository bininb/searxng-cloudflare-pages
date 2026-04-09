// 🔥 最终完美版：DuckDuckGo 搜索，完整解析+格式化
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

    // 🔧 修复：正确解析标题和摘要
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics.slice(0, 10)) {
        if (item.FirstURL && item.Text) {
          // 用 " - " 分割标题和摘要，适配DDG的返回格式
          const splitIndex = item.Text.indexOf(' - ');
          let title, content;
          
          if (splitIndex !== -1) {
            title = item.Text.slice(0, splitIndex).trim();
            content = item.Text.slice(splitIndex + 3).trim();
          } else {
            // 没有分割符时，直接用全文当标题，摘要留空
            title = item.Text.trim();
            content = "无详细摘要";
          }

          results.push({
            title: title,
            url: item.FirstURL,
            content: content
          });
        }
      }
    }

    // 兜底：如果没结果，给提示
    if (results.length === 0) {
       results.push({
         title: "暂无搜索结果",
         url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
         content: "请尝试更换关键词或直接访问 DuckDuckGo 查看详情。"
       });
    }

    if (format === 'json') {
      // ✅ 格式化JSON，让结果清晰可读
      return new Response(JSON.stringify({ query: q, results }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // 网页端展示优化
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
