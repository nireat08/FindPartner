export default async function handler(req, res) {
  // Vercel 환경 변수에서 숨겨둔 주소를 가져옵니다.
  const GAS_URL = process.env.GAS_URL;
 
  try {
    const url = new URL(GAS_URL);
    
    
    // 프론트엔드에서 보낸 쿼리스트링(검색어 등)이 있다면 그대로 GAS로 전달
    if (req.method === 'GET') {
      for (const [key, value] of Object.entries(req.query)) {
        url.searchParams.append(key, value);
      }
    }

    const options = {
      method: req.method,
    };

    // POST 요청일 경우 데이터 처리
    if (req.method === 'POST') {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      options.headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    res.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy Error:', error);
    // 프론트엔드 코드의 if (data.error) 에 걸리도록 포맷을 맞춤
    res.status(500).json({ error: "서버 통신 중 오류가 발생했습니다." }); 
  }
}