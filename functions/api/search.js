import axios from 'axios';

export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || '';
  const format = searchParams.get('format') || 'json';

  if (!q) {
    return new Response(JSON.stringify({ error: 'q 参数不能为空' }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      status: 400
    });
  }

  try {
    // 换用百度搜索，国内更稳定，反爬更友好
    const res = await axios.get('https://www.baidu.com/s', {
      params: { wd: q },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.baidu.com/'
      },
      timeout: 10000
    });

    const html = res.data;
    const results = [];

    // 百度搜索结果的稳定正则匹配（适配百度最新页面结构）
    const resultBlocks = html.match(/<div class="result c-container[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g) || [];

    for (const block of resultBlocks.slice(0, 10)) { // 取前10条结果
      // 提取标题
      const titleMatch = block.match(/<h3[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/);
      // 提取摘要
      const snippetMatch = block.match(/<span class="content-right_1sW9P[^>]*>([\s\S]*?)<\/span>|<span class="abstract[^>]*>([\s\S]*?)<\/span>/);

      if (titleMatch) {
        let url = titleMatch[1];
        // 处理百度的跳转链接，还原真实URL
        if (url.startsWith('/')) {
          const realUrlMatch = url.match(/url=([^&]+)/);
          if (realUrlMatch) url = decodeURIComponent(realUrlMatch[1]);
        }

        const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();
        const content = snippetMatch ? (snippetMatch[1] || snippetMatch[2] || '').replace(/<[^>]+>/g, '').trim() : '';

        results.push({ title, url, content });
      }
    }

    if (format === 'json') {
      return new Response(JSON.stringify({ query: q, results }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    } else {
      const htmlResult = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>搜索结果：${q}</title></head>
        <body>
          <h1>搜索结果：${q}</h1>
          ${results.map(r => `
            <div style="margin: 20px 0;">
              <h3><a href="${r.url}" target="_blank">${r.title}</a></h3>
              <p>${r.content}</p>
            </div>
          `).join('')}
        </body>
        </html>
      `;
      return new Response(htmlResult, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: '搜索失败', detail: e.toString() }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      status: 500
    });
  }
}
