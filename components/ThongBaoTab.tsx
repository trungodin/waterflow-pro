"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchThongBaoByDate,
  saveThongBaoImage,
  uploadHinhThongBao,
  checkCustomerDebt,
  saveDebtCheckResult,
} from "@/app/payments/thong-bao-actions";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getThongBaoCache,
  setThongBaoCache,
  getLastThongBaoDate,
} from "@/lib/thong-bao-cache";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ThongBaoRow {
  id: string;
  ref_id: string;
  ky_nam: string;
  danh_bo: string;
  ten_kh: string;
  so_nha: string;
  duong: string;
  tong_tien: number;
  tong_ky: number;
  hop_bv: string;
  hinh_tb: string;
  ngay_goi_tb: string;
  tinh_trang: string;
  nhom: string;
  stt?: number | string;
  dot?: string;
  gb?: string;
  so_than?: string;
  dia_chi?: string;
  ngay_giao?: string | Date;
  mlt2?: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const isProcessed = (t: string) => {
  if (!t) return false;
  const u = t.toUpperCase().normalize("NFC");
  return u.includes("ĐÃ THANH TOÁN");
};
const isUnpaid = (t: string) => {
  if (!t) return false;
  const u = t.toUpperCase().normalize("NFC");
  return u.includes("CHƯA THANH TOÁN");
};
const isHandled = (t: string) => {
  if (!t) return false;
  const u = t.toUpperCase().normalize("NFC");
  return u.includes("ĐÃ XỬ LÝ");
};
const isLocked = (t: string) => {
  if (!t) return false;
  const u = t.toUpperCase().normalize("NFC");
  return u.includes("KHÓA NƯỚC") || u.includes("ĐANG KHOÁ");
};

function fmtDate(raw: string) {
  if (!raw) return "";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) return raw;
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch { }
  return raw;
}

function fmtCurrency(n: number | string) {
  const num = typeof n === "string" ? parseFloat(n.replace(/[,.]/g, "")) : n;
  if (!num || isNaN(num)) return "0";
  return num.toLocaleString("vi-VN") + " đ";
}

// ─── ThongBao Modal (chụp ảnh) ────────────────────────────────────────────────
function ThongBaoModal({
  row,
  userEmail,
  onClose,
  onSuccess,
}: {
  row: ThongBaoRow;
  userEmail: string;
  onClose: () => void;
  onSuccess: (updatedRow: Partial<ThongBaoRow>) => void;
}) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageDataUrl) {
      setError("Vui lòng chụp/chọn ảnh thông báo");
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      // Upload ảnh và đợi URL
      const uploadRes = await uploadHinhThongBao(
        row.ref_id,
        row.danh_bo,
        imageDataUrl,
        "image/jpeg",
      );
      if (!uploadRes.success || !uploadRes.path)
        throw new Error(uploadRes.error || "Lỗi lưu ảnh");

      const hinhTbPath = uploadRes.path;

      // Lưu DB
      const saveRes = await saveThongBaoImage(row.ref_id, hinhTbPath);
      if (!saveRes.success) throw new Error(saveRes.error || "Lỗi lưu dữ liệu");

      onSuccess({
        hinh_tb: hinhTbPath,
        ngay_goi_tb: saveRes.ngayGoiTb || new Date().toLocaleString("vi-VN"),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <div className="text-xs opacity-80">Gửi thông báo</div>
            <div className="font-bold text-lg">
              {row.danh_bo} – {row.ten_kh}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image box */}
          <div
            className={`w-full h-48 rounded-xl border-2 ${imageDataUrl ? "border-gray-200" : "border-red-300 border-dashed bg-red-50"} flex items-center justify-center overflow-hidden cursor-pointer relative`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageDataUrl ? (
              <>
                <img
                  src={imageDataUrl}
                  alt="Ảnh thông báo"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageDataUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-red-600 font-semibold text-sm">
                  Chưa có ảnh thông báo
                </div>
                <div className="text-red-400 text-xs">
                  (Bắt buộc) – Nhấn để chọn ảnh
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
            >
              📷 Chụp ảnh
            </button>
            <button
              className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
            >
              🖼️ Thư viện
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all ${isSaving ? "bg-gray-400 cursor-not-allowed" : !imageDataUrl ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {isSaving
              ? "⏳ Đang lưu..."
              : !imageDataUrl
                ? "⚠️ Lưu (Chưa có ảnh)"
                : "💾 Lưu hình"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ThongBaoCard({
  row,
  onViewDetail,
  onThongBao,
}: {
  row: ThongBaoRow;
  onViewDetail: () => void;
  onThongBao: () => void;
}) {
  const paid = isProcessed(row.tinh_trang);
  const unpaid = isUnpaid(row.tinh_trang);
  const locked = isLocked(row.tinh_trang);
  const handled = isHandled(row.tinh_trang);

  const proxyUrl = (path: string) =>
    path ? `/api/drive/image?path=${encodeURIComponent(path)}` : "";

  // Thêm classes tương ứng với từng trạng thái
  let cardClass = "border-gray-200 bg-white";
  let circleClass = "bg-gray-100 text-gray-700 border-gray-300";
  let statusClass = "bg-gray-100 text-gray-600";

  if (locked) {
    cardClass = "border-red-200 bg-red-50";
    circleClass = "bg-red-100 text-red-700 border-red-300";
    statusClass = "bg-red-100 text-red-700";
  } else if (handled) {
    cardClass = "border-purple-200 bg-purple-50";
    circleClass = "bg-purple-100 text-purple-700 border-purple-300";
    statusClass = "bg-purple-100 text-purple-700";
  } else if (paid) {
    cardClass = "border-green-200 bg-green-50";
    circleClass = "bg-green-100 text-green-700 border-green-300";
    statusClass = "bg-green-100 text-green-700";
  } else if (unpaid) {
    cardClass = "border-orange-200 bg-orange-50";
    circleClass = "bg-orange-100 text-orange-700 border-orange-300";
    statusClass = "bg-orange-100 text-orange-700";
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${cardClass}`}
      onClick={onViewDetail}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${circleClass}`}
          >
            <span className="text-lg font-black">{row.stt || "-"}</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base">
              {row.danh_bo}
            </div>
            <div className="text-sm text-gray-600">{row.ten_kh}</div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 mb-1 ${statusClass}`}
          >
            {row.tinh_trang || "Chưa kiểm tra"}
          </span>
          <span className="text-xs font-semibold text-red-600">
            {fmtCurrency(row.tong_tien)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm text-gray-700 font-medium">
        <span>
          {row.so_nha} {row.duong}
        </span>
      </div>

      {row.ngay_goi_tb && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs text-blue-600 font-bold">
            <span>🕐</span> Thông báo: {fmtDate(row.ngay_goi_tb)}
          </div>
          {row.hinh_tb && (
            <div
              className="text-xs text-blue-500 font-bold underline hover:text-blue-700 flex items-center gap-1 cursor-pointer w-fit"
              onClick={(e) => {
                e.stopPropagation();
                window.open(proxyUrl(row.hinh_tb), "_blank");
              }}
            >
              <span>🖼️</span> Xem ảnh chụp
            </div>
          )}
        </div>
      )}

      {/* Chỉ hiện nút Gửi Thông Báo khi chưa có ảnh */}
      {!row.hinh_tb && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onThongBao();
            }}
            className="px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
          >
            📸 Gửi Thông Báo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ThongBaoTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ThongBaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tbRow, setTbRow] = useState<ThongBaoRow | null>(null);
  const [detailRow, setDetailRow] = useState<ThongBaoRow | null>(null); // MỚI: Dành cho Detail Modal
  const [isCheckingDebt, setIsCheckingDebt] = useState(false);
  const [debtCheckProgress, setDebtCheckProgress] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(() => {
    // Try to restore the exact date the user was viewing last time
    if (typeof window !== "undefined") {
      const cachedDate = getLastThongBaoDate();
      if (cachedDate) return cachedDate;
    }
    return todayStr;
  });

  const userEmail = user?.email || "";

  const load = useCallback(
    async (date: string, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const target = date || todayStr;

        if (!forceRefresh) {
          // Try to load from cache first
          const cached = getThongBaoCache(target);
          if (cached && cached.length > 0) {
            setRows(cached as ThongBaoRow[]);
            // We can return early to use cache, avoiding unnecessary refetching
            setLoading(false);
            return;
          }
        }

        const data = await fetchThongBaoByDate(target);
        setRows(data as ThongBaoRow[]);
        setThongBaoCache(target, data as ThongBaoRow[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [todayStr],
  );

  // Sync rows state to cache whenever it updates (e.g. after checking debt or successfully uploading image)
  // Caching useEffect removed because it causes bugs when switching dates

  useEffect(() => {
    load(selectedDate);
  }, [load, selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const resetToToday = () => setSelectedDate(todayStr);
  const isToday = selectedDate === todayStr;

  const handleTbSuccess = (rowId: string, updated: Partial<ThongBaoRow>) => {
    setRows((prev) => {
      const newRows = prev.map((r) =>
        r.ref_id === rowId ? { ...r, ...updated } : r,
      );
      setThongBaoCache(selectedDate, newRows);
      return newRows;
    });
    setTbRow(null);
  };

  const cancelDebtCheckRef = useRef(false);

  const startDebtCheck = async () => {
    if (isCheckingDebt) {
      // User clicked stop
      cancelDebtCheckRef.current = true;
      setIsCheckingDebt(false);
      return;
    }
    cancelDebtCheckRef.current = false;
    setIsCheckingDebt(true);
    setDebtCheckProgress(0);

    // Lọc những người chưa thanh toán hoặc chưa có tình trạng từ danh sách ĐÃ LỌC
    const toCheck = filtered.filter(
      (r) =>
        !r.tinh_trang ||
        r.tinh_trang.toUpperCase().includes("CHƯA") ||
        r.tinh_trang === "",
    );

    let completed = 0;
    const chunkSize = 10; // Tăng lên 10 để check lẹ hơn

    for (let i = 0; i < toCheck.length; i += chunkSize) {
      if (cancelDebtCheckRef.current) {
        break; // Dừng check nợ
      }
      const chunk = toCheck.slice(i, i + chunkSize);

      // Batch cập nhật state để tránh giật lag UI (re-render nhiều lần)
      const chunkResults: { ref_id: string; tinh_trang: string }[] = [];

      await Promise.all(
        chunk.map(async (row) => {
          if (cancelDebtCheckRef.current) return;
          const res = await checkCustomerDebt(row.danh_bo);
          if (res.success && !cancelDebtCheckRef.current) {
            const newStatus = res.isDebt ? "CHƯA THANH TOÁN" : "ĐÃ THANH TOÁN";
            chunkResults.push({ ref_id: row.ref_id, tinh_trang: newStatus });

            // Ghi đè trạng thái lên server
            await saveDebtCheckResult(
              row.ref_id,
              newStatus,
              res.isDebt ? res.totalDebt : 0,
            );
          }
        }),
      );

      if (chunkResults.length > 0 && !cancelDebtCheckRef.current) {
        setRows((prev) => {
          const newRows = prev.map((r) => {
            const result = chunkResults.find((cr) => cr.ref_id === r.ref_id);
            if (result) {
              return { ...r, tinh_trang: result.tinh_trang };
            }
            return r;
          });
          setThongBaoCache(selectedDate, newRows);
          return newRows;
        });
      }

      if (!cancelDebtCheckRef.current) {
        completed += chunk.length;
        setDebtCheckProgress(completed);
      }
      // Add a very small delay between chunks to avoid rate limit
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsCheckingDebt(false);
    if (!cancelDebtCheckRef.current) {
      alert("Kiểm tra nợ hoàn tất!");
    } else {
      alert("Đã dừng kiểm tra nợ.");
    }
  };

  const roleFilteredRows = rows.filter((r) => {
    // 1. Chỉ lấy 2 nhóm Sang Sơn và Thi Náo
    const lowerNhom = (r.nhom || "").toLowerCase();
    const isSangSon =
      lowerNhom.includes("sang sơn") || lowerNhom.includes("sang son");
    const isThiNao =
      lowerNhom.includes("thi náo") || lowerNhom.includes("thi nao");

    if (!isSangSon && !isThiNao) return false;

    // 2. Filter theo Quyền (Admin Manager thì xem được hết, còn dmn_staff/collector chỉ thấy nhóm của họ)
    if (user && user.role !== "admin" && user.role !== "manager") {
      // @ts-ignore
      const userNhom = (user.groups || []).map((g: any) =>
        String(g).toLowerCase(),
      );

      if (userNhom.length > 0) {
        const canViewSangSon = userNhom.some(
          (u: string) =>
            u.includes("sang") || u.includes("sơn") || u.includes("son"),
        );
        const canViewThiNao = userNhom.some(
          (u: string) =>
            u.includes("thi") || u.includes("náo") || u.includes("nao"),
        );

        if (isSangSon && !canViewSangSon) return false;
        if (isThiNao && !canViewThiNao) return false;
      }
    }
    return true;
  });

  const availableGroups = ["Sang Sơn", "Thi Náo"].filter((safeGrp) => {
    return roleFilteredRows.some((r) => {
      const lower = (r.nhom || "").toLowerCase();
      if (safeGrp === "Sang Sơn")
        return lower.includes("sang sơn") || lower.includes("sang son");
      if (safeGrp === "Thi Náo")
        return lower.includes("thi náo") || lower.includes("thi nao");
      return false;
    });
  });

  const filtered = roleFilteredRows.filter((r) => {
    // Filter theo Group
    if (selectedGroup && selectedGroup !== "") {
      const lowerNhom = (r.nhom || "").toLowerCase();
      const isSangSon =
        lowerNhom.includes("sang sơn") || lowerNhom.includes("sang son");
      const isThiNao =
        lowerNhom.includes("thi náo") || lowerNhom.includes("thi nao");

      if (selectedGroup === "Sang Sơn" && !isSangSon) return false;
      if (selectedGroup === "Thi Náo" && !isThiNao) return false;
    }

    // Filter theo Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !`${r.danh_bo} ${r.ten_kh} ${r.so_nha} ${r.duong}`
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }
    }

    return true;
  });

  // Gom nhóm theo 2 Tổ Cố Định
  const groupedData = filtered.reduce(
    (acc, row) => {
      const lowerNhom = (row.nhom || "").toLowerCase();
      const groupKey =
        lowerNhom.includes("sang sơn") || lowerNhom.includes("sang son")
          ? "Sang Sơn"
          : "Thi Náo";

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(row);
      return acc;
    },
    {} as Record<string, ThongBaoRow[]>,
  );

  // Sort các nhóm
  const sortedGroupKeys = Object.keys(groupedData).sort((a, b) =>
    a.localeCompare(b, "vi-VN", { numeric: true }),
  );

  const unpaidCount = filtered.filter((r) => isUnpaid(r.tinh_trang)).length;
  const paidCount = filtered.filter((r) => isProcessed(r.tinh_trang)).length;

  const handlePrint = (debtOnly: boolean = false) => {
    // Print window contents logic
    const listToPrint = debtOnly
      ? filtered.filter((r) => isUnpaid(r.tinh_trang))
      : filtered;

    if (listToPrint.length === 0) {
      alert("Không có dữ liệu để in!");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formattedDate = selectedDate
      ? selectedDate.split("-").reverse().join("/")
      : "DD/MM/YYYY";
    const groupName = selectedGroup || "Tất cả các Nhóm/Tổ";
    const title = debtOnly
      ? "DANH SÁCH KHÁCH HÀNG CÒN NỢ"
      : "DANH SÁCH THÔNG BÁO";

    let tableRows = "";
    listToPrint.forEach((r, index) => {
      // Clean string currency to numeric if needed, or just let it as is with fmtCurrency function and remove ₫ if present
      const formattedToCurrency = fmtCurrency(r.tong_tien).replace(" ₫", "");

      tableRows += `
        <tr>
          <td style="text-align: center;">${r.stt || ""}</td>
          <td style="font-weight: bold; font-size: 13px; text-align: center;">${r.danh_bo || ""}</td>
          <td>${r.so_nha || ""}</td>
          <td>${r.dia_chi || ""}</td>
          <td>${r.duong || ""}</td>
          <td>${r.ten_kh || ""}</td>
          <td style="text-align: center;">${r.tong_ky || ""}</td>
          <td style="text-align: right; font-size: 13px;">${formattedToCurrency}</td>
          <td>${r.ky_nam || ""}</td>
          <td style="text-align: center;">${(r as any).gb || ""}</td>
          <td style="text-align: center;">${(r as any).dot || ""}</td>
          <td style="text-align: center;">${r.hop_bv || ""}</td>
          <td style="text-align: center;">${(r as any).so_than || ""}</td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              margin: 0;
            }
            body {
              margin: 1cm;
            }
          }
          @page {
            size: A4 landscape;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 10mm;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            box-sizing: border-box;
            background: #fff;
          }
          h2 {
            text-align: center;
            margin: 5px 0;
            font-size: 18px;
            font-weight: bold;
          }
          .header-info {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #777;
            padding: 3px 2px;
            word-wrap: break-word;
          }
          th {
            background-color: #5b9bd5;
            color: white;
            text-align: center;
            font-weight: bold;
          }
          .col-stt { width: 3%; }
          .col-danhbo { width: 9%; }
          .col-sonha { width: 8%; }
          .col-dctt { width: 6%; }
          .col-duong { width: 10%; }
          .col-tenkh { width: 16%; }
          .col-ky { width: 3%; }
          .col-tongtien { width: 8%; }
          .col-kynam { width: 11%; }
          .col-gb { width: 3%; }
          .col-dot { width: 3%; }
          .col-hop { width: 4%; }
          .col-sothan { width: 6%; }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f8fafc; border-bottom: 2px dashed #cbd5e1; display: flex; justify-content: flex-end; gap: 10px; position: sticky; top: 0; z-index: 50;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px;">🖨️ In</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">❌ Đóng</button>
        </div>
        <h2>${title}</h2>
        <div class="header-info">Ngày : ${formattedDate}</div>
        <div class="header-info" style="margin-bottom: 10px;">Nhóm : ${groupName}</div>
        <table>
          <thead>
            <tr>
              <th class="col-stt">STT</th>
              <th class="col-danhbo">Danh bộ</th>
              <th class="col-sonha">Số nhà</th>
              <th class="col-dctt">ĐCTT</th>
              <th class="col-duong">Đường</th>
              <th class="col-tenkh">Tên khách hàng</th>
              <th class="col-ky">Kỳ</th>
              <th class="col-tongtien">Tổng tiền</th>
              <th class="col-kynam">Kỳ năm</th>
              <th class="col-gb">GB</th>
              <th class="col-dot">Đợt</th>
              <th class="col-hop">Hộp</th>
              <th class="col-sothan">Số thân</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-blue-800 flex items-center gap-2">
            📢 Danh sách Thông Báo
          </h2>
          <p className="text-xs text-blue-600 mt-0.5">
            {isToday
              ? `Hôm nay – ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`
              : new Date(selectedDate + "T00:00:00").toLocaleDateString(
                "vi-VN",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                },
              )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-blue-700 whitespace-nowrap">
              📅 Ngày:
            </label>
            <div className="relative">
              <div className="px-3 py-1.5 border border-blue-200 rounded-lg text-sm font-bold text-gray-700 bg-white flex items-center gap-2 cursor-pointer min-w-[130px] justify-between">
                <span>
                  {selectedDate
                    ? selectedDate.split("-").reverse().join("/")
                    : "DD/MM/YYYY"}
                </span>
                <span className="text-gray-500">📅</span>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                onClick={(e) => {
                  try {
                    if ("showPicker" in HTMLInputElement.prototype) {
                      (e.target as any).showPicker();
                    }
                  } catch (error) {
                    // ignore
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {!isToday && (
              <button
                onClick={resetToToday}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                ↩ Hôm nay
              </button>
            )}
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 text-center">
            <div className="text-xl font-bold text-blue-700">
              {filtered.length}
            </div>
            <div className="text-xs text-gray-500">Tổng bảng</div>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-orange-100 text-center">
            <div className="text-xl font-bold text-orange-600">
              {unpaidCount}
            </div>
            <div className="text-xs text-gray-500">Chưa TT</div>
          </div>
          <button
            onClick={startDebtCheck}
            disabled={!isCheckingDebt && filtered.length === 0}
            className={`px-4 py-2 ${isCheckingDebt ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-orange-500 hover:bg-orange-600"} text-white text-sm font-bold rounded-lg transition-colors`}
          >
            {isCheckingDebt
              ? `⏹ Dừng kiểm... (${debtCheckProgress})`
              : "🔍 Auto Check Nợ"}
          </button>
          <button
            onClick={() => handlePrint(false)}
            disabled={filtered.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            🖨️ In Danh Sách
          </button>
          <button
            onClick={() => handlePrint(true)}
            disabled={unpaidCount === 0}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            🖨️ In Nợ
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm danh bạ, tên KH, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 font-bold placeholder:font-normal placeholder:text-gray-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[200px] font-bold text-gray-900"
        >
          <option value="" className="font-bold">
            Tất cả các Nhóm/Tổ
          </option>
          {availableGroups.map((grp) => (
            <option key={grp} value={grp} className="font-bold">
              {grp}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Đang tải dữ liệu...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
          ⚠️ {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <div className="text-5xl mb-3">📢</div>
          <div className="text-base font-medium">
            Không có dữ liệu thông báo cho ngày {selectedDate}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroupKeys.map((groupKey) => {
            const groupRows = groupedData[groupKey];
            return (
              <div key={groupKey} className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800 bg-gray-100 py-2 px-4 rounded-lg flex justify-between items-center shadow-sm">
                  <span>🏢 {groupKey}</span>
                  <span className="text-sm font-semibold bg-white text-gray-600 px-3 py-1 rounded-full border border-gray-200">
                    {groupRows.length} KH
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {groupRows.map((row) => (
                    <ThongBaoCard
                      key={row.ref_id}
                      row={row}
                      onViewDetail={() => setDetailRow(row)}
                      onThongBao={() => setTbRow(row)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mo Nuoc Modal */}
      {tbRow && (
        <ThongBaoModal
          row={tbRow}
          userEmail={userEmail}
          onClose={() => setTbRow(null)}
          onSuccess={(updated) => handleTbSuccess(tbRow.ref_id, updated)}
        />
      )}

      {/* Chi tiết Khách hàng Modal */}
      {detailRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailRow(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                Thông tin chi tiết
              </h3>
              <button
                onClick={() => setDetailRow(null)}
                className="text-gray-400 hover:text-gray-800 p-1"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Danh Bạ
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.danh_bo}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Tên KH
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.ten_kh}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Địa Chỉ
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.so_nha} {detailRow.duong}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    ĐC Thực Tế
                  </span>
                  <div
                    className="font-semibold text-gray-900 line-clamp-2"
                    title={detailRow.dia_chi}
                  >
                    {detailRow.dia_chi || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Tổng Nợ
                  </span>
                  <div className="font-semibold text-red-600">
                    {fmtCurrency(detailRow.tong_tien)} ({detailRow.tong_ky} kỳ)
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Kỳ Năm
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.ky_nam || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Đợt / GB
                  </span>
                  <div className="font-semibold text-gray-900">
                    {((detailRow as any).dot || "-") +
                      " / " +
                      ((detailRow as any).gb || "-")}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Hộp BV / Số Thân
                  </span>
                  <div className="font-semibold text-gray-900">
                    {(detailRow.hop_bv || "-") +
                      " / " +
                      ((detailRow as any).so_than || "-")}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Ngày Giao TB
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.ngay_giao
                      ? fmtDate(detailRow.ngay_giao.toString())
                      : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Nhóm / STT
                  </span>
                  <div className="font-semibold text-gray-900">
                    {detailRow.nhom || "-"} / STT: {detailRow.stt || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold block">
                    Tình Trạng Nợ
                  </span>
                  <div
                    className={`font-semibold ${isLocked(detailRow.tinh_trang) ? "text-red-600" : isHandled(detailRow.tinh_trang) ? "text-purple-600" : isUnpaid(detailRow.tinh_trang) ? "text-orange-600" : "text-green-600"}`}
                  >
                    {detailRow.tinh_trang || "Chưa kiểm tra"}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-bold text-gray-700 mb-2">📢 Thông Báo</h4>
                {detailRow.ngay_goi_tb ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="text-sm font-semibold text-blue-800 mb-2">
                      Đã gửi lúc: {fmtDate(detailRow.ngay_goi_tb)}
                    </div>
                    {detailRow.hinh_tb ? (
                      <img
                        src={
                          detailRow.hinh_tb.startsWith("http")
                            ? detailRow.hinh_tb
                            : `/api/drive/image?path=${encodeURIComponent(detailRow.hinh_tb)}`
                        }
                        alt="Hinh TB"
                        className="rounded-lg max-h-60 border shadow-sm cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            detailRow.hinh_tb.startsWith("http")
                              ? detailRow.hinh_tb
                              : `/api/drive/image?path=${encodeURIComponent(detailRow.hinh_tb)}`,
                            "_blank",
                          );
                        }}
                      />
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        Không có hình ảnh hệ thống upload.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                    Khách hàng này chưa có dữ liệu gửi thông báo.
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setDetailRow(null)}
                className="px-5 py-2 font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
