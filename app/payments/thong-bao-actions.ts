"use server";

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateFlexible(raw: string): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.toLowerCase() === "nan") return null;

  // DD/MM/YYYY or D/M/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// ─── Actions ─────────────────────────────────────────────────────────────────

// Lấy danh sách thông báo theo ngày (mặc định hôm nay)
export async function fetchThongBaoByDate(targetDate?: string) {
  try {
    const supabase = getSupabase();
    const target = targetDate
      ? (() => {
          const [y, m, d] = targetDate.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date();

    // Tạo chuỗi lọc ngày (Hỗ trợ các dạng DD/MM/YYYY, YYYY-MM-DD, D/M/YYYY...)
    const yStr = target.getFullYear().toString();
    const mStr = (target.getMonth() + 1).toString().padStart(2, "0");
    const dStr = target.getDate().toString().padStart(2, "0");
    const mStrShort = (target.getMonth() + 1).toString();
    const dStrShort = target.getDate().toString();

    const f1 = `${yStr}-${mStr}-${dStr}`; // 2026-02-28
    const f2 = `${dStr}/${mStr}/${yStr}`; // 28/02/2026
    const f3 = `${dStrShort}/${mStrShort}/${yStr}`; // 28/2/2026
    const f4 = `${dStr}/${mStrShort}/${yStr}`; // 28/2/2026
    const f5 = `${dStrShort}/${mStr}/${yStr}`; // 28/02/2026

    const filterString = `ngay_giao.ilike.%${f1}%,ngay_giao.ilike.%${f2}%,ngay_giao.ilike.%${f3}%,ngay_giao.ilike.%${f4}%,ngay_giao.ilike.%${f5}%`;

    // Lấy dữ liệu đã lọc trực tiếp từ Supabase thay vì tải toàn bộ
    const { data: dbData, error } = await supabase
      .from("assigned_customers")
      .select(
        "id,ref_id,ky_nam,danh_bo,ten_kh,so_nha,duong,tong_tien,tong_ky,hop_bv,hinh_tb,ngay_giao,ngay_goi_tb,tinh_trang,hinh_anh,nhom,stt,dot,gb,so_than,dia_chi",
      )
      .or(filterString);

    if (error) throw error;
    if (!dbData || dbData.length === 0) return [];

    // Filter client-side để chắc chắn 100% khớp ngày nếu search % vô tình dính chuỗi khác
    let filtered = dbData.filter((row: any) => {
      const raw = row.ngay_giao?.toString().trim() || "";
      if (!raw) return false;
      const parsed = parseDateFlexible(raw);
      return parsed ? isSameDay(parsed, target) : false;
    });

    // Sắp xếp
    filtered.sort((a, b) => {
      const nhomA = (a.nhom || "").toLowerCase();
      const nhomB = (b.nhom || "").toLowerCase();
      if (nhomA !== nhomB) return nhomA.localeCompare(nhomB);

      const sttA = a.stt != null ? Number(a.stt) : Infinity;
      const sttB = b.stt != null ? Number(b.stt) : Infinity;
      if (sttA !== sttB && !isNaN(sttA) && !isNaN(sttB)) return sttA - sttB;

      return (a.danh_bo || "").localeCompare(b.danh_bo || "");
    });

    return filtered;
  } catch (err) {
    console.error("fetchThongBaoByDate error:", err);
    return [];
  }
}

// Upload ảnh thông báo lên Supabase Storage
export async function uploadHinhThongBao(
  id: string,
  danhBa: string,
  fileBase64: string,
  mimeType: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const supabase = getSupabase();
    const fileName = `${danhBa}_${Date.now()}_tb.jpg`;
    const filePath = `ON_OFF_Images/${fileName}`;

    // Convert base64 → Uint8Array
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from("on-off-images")
      .upload(fileName, bytes, {
        contentType: mimeType || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Storage upload failed:", uploadError.message);
      return { success: false, error: uploadError.message };
    }

    return { success: true, path: filePath };
  } catch (err: any) {
    console.error("uploadHinhThongBao error:", err);
    return { success: false, error: err.message };
  }
}

// Cập nhật trạng thái thông báo
export async function saveThongBaoImage(
  id: string, // ref_id
  hinhTbPath: string,
) {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ngayGoiTb = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Update assigned_customers
    const { error: errorS1 } = await supabase
      .from("assigned_customers")
      .update({
        hinh_tb: hinhTbPath,
        ngay_goi_tb: ngayGoiTb,
      })
      .eq("ref_id", id);

    if (errorS1) throw errorS1;

    // Sync sang water_lock_status
    const { data: wlsData } = await supabase
      .from("water_lock_status")
      .select("id")
      .eq("ref_id", id)
      .single();

    if (wlsData) {
      await supabase
        .from("water_lock_status")
        .update({
          hinh_tb: hinhTbPath,
          ngay_tb: ngayGoiTb,
        })
        .eq("ref_id", id);
    }

    return { success: true, ngayGoiTb };
  } catch (err: any) {
    console.error("saveThongBaoImage error:", err);
    return { success: false, error: err.message };
  }
}

import { fetchSql } from "@/lib/soap-api";

// Kiểm tra nợ
export async function checkCustomerDebt(danhBa: string) {
  try {
    const sqlQuery = `
            SELECT DANHBA, SOHOADON, KY, NAM, TONGCONG, TENKH, SO, DUONG, GB, DOT
            FROM HoaDon 
            WHERE DANHBA = '${danhBa}' AND NGAYGIAI IS NULL
            ORDER BY NAM DESC, KY DESC
        `;
    const invoices = await fetchSql("f_Select_SQL_Thutien", sqlQuery);

    if (!invoices || invoices.length === 0) {
      return { success: true, isDebt: false, message: "Không có nợ" };
    }

    const soHoaDonList = invoices.map((inv) => inv.SOHOADON).filter(Boolean);

    if (soHoaDonList.length === 0) {
      return { success: true, isDebt: false, message: "Không có nợ" };
    }

    // Lấy hóa đơn thanh toán qua BGW
    const bgwQuery = `
            SELECT SHDon 
            FROM BGW_HD 
            WHERE SHDon IN (${soHoaDonList.map((s) => `'${s}'`).join(",")})
        `;
    const bgwPaid = await fetchSql("f_Select_SQL_Nganhang", bgwQuery);
    const paidSet = new Set(bgwPaid.map((x) => x.SHDon));

    const unpaidInvoices = invoices.filter((inv) => !paidSet.has(inv.SOHOADON));

    const isDebt = unpaidInvoices.length > 0;
    const totalDebt = unpaidInvoices.reduce(
      (sum, inv) => sum + (Number(inv.TONGCONG) || 0),
      0,
    );
    return { success: true, isDebt, unpaidInvoices, totalDebt };
  } catch (err: any) {
    console.error("checkCustomerDebt error:", err);
    return { success: false, error: err.message };
  }
}

// Lưu trạng thái nợ vừa kiểm tra xong
export async function saveDebtCheckResult(
  id: string,
  tinhTrang: string,
  totalDebt: number = 0,
) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("assigned_customers")
      .update({
        tinh_trang: tinhTrang,
        tong_tien: totalDebt,
      })
      .eq("ref_id", id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("saveDebtCheckResult error:", err);
    return { success: false, error: err.message };
  }
}
