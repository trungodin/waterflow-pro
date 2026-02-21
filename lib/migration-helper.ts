
'use server'

import { google } from 'googleapis'

// Helper to get Google Sheets Client (Since we need to read from sheet ONCE for migration)
// We only use this for 'migration' purpose now.
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function getDatabaseSheetDataForMigration() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      console.error('[getDatabaseSheetData] GOOGLE_SHEET_ID not configured')
      return []
    }

    const sheetName = process.env.DB_SHEET_NAME || 'database'

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return []
    }

    const headers = rows[0]

     // Helper to find index
    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h: string) => {
        const lower = h.toLowerCase().replace(/\s/g, '_')
        return keywords.some(k => lower === k || lower.includes(k))
      })
    }

    const colIndices = {
      danhBa: findIndex(['danh_bo', 'danh_bạ', 'danh_ba']),
      tenKH: findIndex(['ten_kh', 'tên_kh']),
      soNha: findIndex(['so_nha', 'số_nhà']),
      duong: findIndex(['duong', 'đường', 'ten_duong', 'tên_đường']), 
      ngayGiao: findIndex(['ngay_giao', 'ngày_giao', 'ngay_giao_ds']),
      nhom: findIndex(['nhom', 'nhóm']),
      ghiChu: findIndex(['ghi_chu', 'ghi_chú']),
      tinhTrang: findIndex(['tinh_trang', 'tình_trạng']), 
      dot: findIndex(['dot', 'đợt']),
      kyNam: findIndex(['ky_nam', 'kỳ_năm']),
      gb: findIndex(['gb']),
      tongTien: findIndex(['tong_tien', 'tổng_tiền']),
      tongKy: findIndex(['tong_ky', 'tổng_kỳ']),
      hopBaoVe: findIndex(['hop_bao_ve', 'hộp_bảo_vệ', 'hop', 'hop_bv']),
      id: findIndex(['id']),
      dctt: findIndex(['dctt']),
      soThan: findIndex(['so_than', 'số_thân']),
      traCuuNo: findIndex(['tra_cuu_no', 'tra_cứu_nợ']),
      hinhAnh: findIndex(['hinh_anh', 'hình_ảnh']),
      hinhTB: findIndex(['hinh_tb', 'hình_tb']),
      ngayGoiTB: findIndex(['ngay_goi_tb', 'ngày_gửi_tb']),
      tinhTrangNo: findIndex(['tinhtrang_no', 'tình_trạng_nợ']),
      ngayKhoaNuoc: findIndex(['ngay_khoa_nuoc', 'ngày_khóa_nước']),
      hinhDHN: findIndex(['hinh_dhn', 'hình_dhn']),
      hinhBienBan: findIndex(['hinh_bien_ban', 'hình_biên_bản']),
      ngayTroNgai: findIndex(['ngay_tro_ngai', 'ngày_trở_ngại']),
      hinhTroNgai: findIndex(['hinh_tro_ngai', 'hình_trở_ngại']),
      noiDungTroNgai: findIndex(['nd_tro_ngai', 'nội_dung_trở_ngại']),
      baoCaoKQ: findIndex(['bao_cao_kq', 'báo_cáo_kq']),
      userSua: findIndex(['user_sua', 'user_sửa']),
      dauTG: findIndex(['dau_tg', 'đầu_tg']),
      dem: findIndex(['dem_', 'đêm']), 
      kieuKhoa: findIndex(['kieu_khoa', 'kiểu_khóa']),
      stt: findIndex(['stt', 'số_thứ_tự', 'so_thu_tu'])
    }

    const data = rows.slice(1).map((row: any[]) => ({
      DanhBa: colIndices.danhBa !== -1 ? String(row[colIndices.danhBa]).padStart(11, '0') : '',
      TenKH: colIndices.tenKH !== -1 ? row[colIndices.tenKH] : '',
      SoNha: colIndices.soNha !== -1 ? row[colIndices.soNha] : '',
      Duong: colIndices.duong !== -1 ? row[colIndices.duong] : '',
      NgayGiao: colIndices.ngayGiao !== -1 ? row[colIndices.ngayGiao] : '',
      Nhom: colIndices.nhom !== -1 ? row[colIndices.nhom] : '',
      GhiChu: colIndices.ghiChu !== -1 ? row[colIndices.ghiChu] : '',
      TinhTrang: colIndices.tinhTrang !== -1 ? row[colIndices.tinhTrang] : '',
      Dot: colIndices.dot !== -1 ? row[colIndices.dot] : '',
      KyNam: colIndices.kyNam !== -1 ? row[colIndices.kyNam] : '',
      GB: colIndices.gb !== -1 ? row[colIndices.gb] : '',
      TongTien: colIndices.tongTien !== -1 ? row[colIndices.tongTien] : '',
      TongKy: colIndices.tongKy !== -1 ? row[colIndices.tongKy] : '',
      HopBaoVe: colIndices.hopBaoVe !== -1 ? row[colIndices.hopBaoVe] : '',
      ID: colIndices.id !== -1 ? row[colIndices.id] : '',
      // New Fields Mapped
      DCTT: colIndices.dctt !== -1 ? row[colIndices.dctt] : '',
      SoThan: colIndices.soThan !== -1 ? row[colIndices.soThan] : '',
      TraCuuNo: colIndices.traCuuNo !== -1 ? row[colIndices.traCuuNo] : '',
      HinhAnh: colIndices.hinhAnh !== -1 ? row[colIndices.hinhAnh] : '',
      HinhTB: colIndices.hinhTB !== -1 ? row[colIndices.hinhTB] : '',
      NgayGoiTB: colIndices.ngayGoiTB !== -1 ? row[colIndices.ngayGoiTB] : '',
      TinhTrangNo: colIndices.tinhTrangNo !== -1 ? row[colIndices.tinhTrangNo] : '',
      NgayKhoaNuoc: colIndices.ngayKhoaNuoc !== -1 ? row[colIndices.ngayKhoaNuoc] : '',
      HinhDHN: colIndices.hinhDHN !== -1 ? row[colIndices.hinhDHN] : '',
      HinhBienBan: colIndices.hinhBienBan !== -1 ? row[colIndices.hinhBienBan] : '',
      NgayTroNgai: colIndices.ngayTroNgai !== -1 ? row[colIndices.ngayTroNgai] : '',
      HinhTroNgai: colIndices.hinhTroNgai !== -1 ? row[colIndices.hinhTroNgai] : '',
      NoiDungTroNgai: colIndices.noiDungTroNgai !== -1 ? row[colIndices.noiDungTroNgai] : '',
      BaoCaoKQ: colIndices.baoCaoKQ !== -1 ? row[colIndices.baoCaoKQ] : '',
      UserSua: colIndices.userSua !== -1 ? row[colIndices.userSua] : '',
      DauTG: colIndices.dauTG !== -1 ? row[colIndices.dauTG] : '',
      Dem: colIndices.dem !== -1 ? row[colIndices.dem] : '',
      KieuKhoa: colIndices.kieuKhoa !== -1 ? row[colIndices.kieuKhoa] : '',
      STT: colIndices.stt !== -1 ? row[colIndices.stt] : ''
    }))

    return data

  } catch (error) {
    console.error('[getDatabaseSheetDataForMigration] Error:', error)
    return []
  }
}

export async function getOnOffSheetDataForMigration() {
  try {
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    const sheetName = process.env.ON_OFF_SHEET_NAME || 'ON_OFF'

    if (!spreadsheetId) return []

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) return []

    const headers = rows[0]
    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h: string) => {
        const lower = h ? h.toLowerCase().replace(/\s/g, '_') : ''
        return keywords.some(k => lower === k || lower.includes(k))
      })
    }

    const col = {
      id_tb: findIndex(['id_tb']),
      danh_ba: findIndex(['danh_ba', 'danh_bạ', 'danh_bo']),
      so_nha: findIndex(['so_nha', 'số_nhà']),
      duong: findIndex(['duong', 'đường']),
      ten_kh: findIndex(['ten_kh', 'tên_kh']),
      tong_ky: findIndex(['tong_ky', 'tổng_kỳ']),
      tong_no: findIndex(['tong_no', 'tổng_nợ']),
      ky_nam: findIndex(['ky_nam', 'kỳ_năm']),
      ngay_khoa: findIndex(['ngay_khoa', 'ngày_khóa']),
      cs_khoa: findIndex(['cs_khoa', 'cs_khóa', 'chi_so_khoa']),
      nhom_khoa: findIndex(['nhom_khoa', 'nhóm_khóa']),
      kieu_khoa: findIndex(['kieu_khoa', 'kiểu_khóa']),
      hop_bv: findIndex(['hop_bv', 'hộp_bảo_vệ']),
      maso_chi: findIndex(['maso_chi', 'mã_số_chì']),
      tinh_trang: findIndex(['tinh_trang', 'tình_trạng']),
      hinh_khoa: findIndex(['hinh_khoa', 'hình_khóa']),
      ngay_mo: findIndex(['ngay_mo', 'ngày_mở']),
      ma_mo: findIndex(['ma_mo', 'mã_mở']),
      nv_mo: findIndex(['nv_mo', 'nhân_viên_mở']),
      cs_mo: findIndex(['cs_mo', 'cs_mở', 'chi_so_mo']),
      ghi_chu_mo: findIndex(['ghi_chu_mo', 'ghi_chú_mở']),
      hinh_mo: findIndex(['hinh_mo', 'hình_mở']),
      file_cpmn: findIndex(['file_cpmn', 'file_de_nghi']),
      ngay_cpmn: findIndex(['ngay_cpmn']),
      tg_cpmn: findIndex(['tg_cpmn']),
      hinh_tb: findIndex(['hinh_tb', 'hình_tb']),
      ngay_tb: findIndex(['ngay_tb', 'ngày_tb'])
    }

    return rows.slice(1).map((row: any[]) => ({
      IdTB: col.id_tb !== -1 ? row[col.id_tb] : '',
      DanhBa: col.danh_ba !== -1 ? String(row[col.danh_ba]).padStart(11, '0') : '',
      // Snapshot fields from ON_OFF sheet
      SoNha: col.so_nha !== -1 ? row[col.so_nha] : '',
      Duong: col.duong !== -1 ? row[col.duong] : '',
      TenKH: col.ten_kh !== -1 ? row[col.ten_kh] : '',
      TongKy: col.tong_ky !== -1 ? row[col.tong_ky] : '',
      TongNo: col.tong_no !== -1 ? row[col.tong_no] : '',
      KyNam: col.ky_nam !== -1 ? row[col.ky_nam] : '',
      // Main fields
      NgayKhoa: col.ngay_khoa !== -1 ? row[col.ngay_khoa] : '',
      CsKhoa: col.cs_khoa !== -1 ? row[col.cs_khoa] : '',
      NhomKhoa: col.nhom_khoa !== -1 ? row[col.nhom_khoa] : '',
      KieuKhoa: col.kieu_khoa !== -1 ? row[col.kieu_khoa] : '',
      HopBaoVe: col.hop_bv !== -1 ? row[col.hop_bv] : '',
      MaSoChi: col.maso_chi !== -1 ? row[col.maso_chi] : '',
      TinhTrang: col.tinh_trang !== -1 ? row[col.tinh_trang] : '',
      HinhKhoa: col.hinh_khoa !== -1 ? row[col.hinh_khoa] : '',
      NgayMo: col.ngay_mo !== -1 ? row[col.ngay_mo] : '',
      MaMo: col.ma_mo !== -1 ? row[col.ma_mo] : '',
      NvMo: col.nv_mo !== -1 ? row[col.nv_mo] : '',
      CsMo: col.cs_mo !== -1 ? row[col.cs_mo] : '',
      GhiChuMo: col.ghi_chu_mo !== -1 ? row[col.ghi_chu_mo] : '',
      HinhMo: col.hinh_mo !== -1 ? row[col.hinh_mo] : '',
      // Map file_cpmn to FileDeNghi for compatibility, or keep both
      FileCpmn: col.file_cpmn !== -1 ? row[col.file_cpmn] : '',
      FileDeNghi: col.file_cpmn !== -1 ? row[col.file_cpmn] : '', 
      NgayCpmn: col.ngay_cpmn !== -1 ? row[col.ngay_cpmn] : '',
      TgCpmn: col.tg_cpmn !== -1 ? row[col.tg_cpmn] : '',
      HinhTb: col.hinh_tb !== -1 ? row[col.hinh_tb] : '',
      NgayTb: col.ngay_tb !== -1 ? row[col.ngay_tb] : ''
    }))

  } catch (error) {
    console.error('[getOnOffSheetDataForMigration] Error:', error)
    return []
  }
}
