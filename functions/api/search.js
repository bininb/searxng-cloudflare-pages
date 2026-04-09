import axios from 'axios';

export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const q = searchParams.get('q') || '';
  const format = searchParams.get('format') || 'json';

  if (!q) {
    return new Response(JSON.stringify({ error: 'q 参数不能为空' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    });
  }

  try {
    // 聚合 Bing 网页搜索（国内可用，无 API Key）
    const res = await axios.get('https://www.bing.com/search', {
      params: { q },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = res.data;
    // 简单解析标题、链接、摘要（演示用，正式可换更完整解析）
    const results = [];
    const titleMatch = [...html.matchAll(/<h2.*?><a.*?href="(.*?)".*?>(.*?)<\/a><\/h2>/g)];
    const snippetMatch = [...html.matchAll(/<p.*?>(.*?)<\/p>/g)];

    for (let i = 0; i < Math.min(10, titleMatch.length); i++) {
      results.push({
        title: titleMatch[i][2]?.replace(/<[^>]+>/g, ''),
        url: titleMatch[i][1]?.replace(/\/*\?.*$/,''),
        content: snippetMatch[i]?.[1]?.replace(/<[^>]+>/g, '') || ''
      });
    }

    if (format === 'json') {
      return new Response(JSON.stringify({ query: q, results }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(`<h1>${q}</h1>${results.map(r => `<div><h3><a href="${r.url}">${r.title}</a></h3><p>${r.content}</p></div>`).join('')}`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: '搜索失败', detail: e+'' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
