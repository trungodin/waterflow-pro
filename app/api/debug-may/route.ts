
import { NextResponse } from 'next/server';
import { executeSqlQuery } from '@/lib/soap';

export async function GET() {
  try {
    const query = `
      SELECT TOP 50 
        ds.DanhBa, 
        ds.Ky, 
        ds.Nam,
        ds.TongTien,
        kh.TenKH,
        (SELECT COUNT(*) FROM HoaDon hd WHERE hd.DANHBA = ds.DanhBa AND hd.NGAYGIAI IS NULL) as UnpaidBillsCount
      FROM [DocSo] ds
      LEFT JOIN [KhachHang] kh ON ds.DanhBa = kh.DanhBa
      WHERE ds.May = '11' AND ds.Nam = 2026 AND ds.Ky = 1
      ORDER BY ds.DanhBa
    `;
    const data = await executeSqlQuery('f_Select_SQL_Doc_so', query);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
