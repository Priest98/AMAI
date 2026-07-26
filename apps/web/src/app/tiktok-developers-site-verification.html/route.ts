import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(
    'tiktok-developers-site-verification=Mc8PFz3Xcvgyl2YsiWryuY6b0xj5EfNy',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
