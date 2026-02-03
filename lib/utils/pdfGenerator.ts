import { jsPDF } from 'jspdf';
import { toVietnameseCurrency } from './n2vi';

// Load Tinos (Times New Roman alternative) from Google Fonts
const FONT_BASE = 'https://raw.githubusercontent.com/google/fonts/main/apache/tinos';
const FONT_URL_REGULAR = `${FONT_BASE}/Tinos-Regular.ttf`;
const FONT_URL_BOLD = `${FONT_BASE}/Tinos-Bold.ttf`;
const FONT_URL_ITALIC = `${FONT_BASE}/Tinos-Italic.ttf`;
const FONT_URL_BOLDITALIC = `${FONT_BASE}/Tinos-BoldItalic.ttf`;

async function loadFont(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load font from ${url}`);
    const buffer = await res.arrayBuffer();

    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export async function generateProposalPDF(customer: any, download = true) {
    try {
        // A5 Landscape (210mm x 148mm)
        const doc = new jsPDF('l', 'mm', 'a5');
        let fontName = 'helvetica';

        try {
            const [fontRegular, fontBold, fontItalic, fontBoldItalic] = await Promise.all([
                loadFont(FONT_URL_REGULAR),
                loadFont(FONT_URL_BOLD),
                loadFont(FONT_URL_ITALIC),
                loadFont(FONT_URL_BOLDITALIC)
            ]);

            doc.addFileToVFS('Tinos-Regular.ttf', fontRegular);
            doc.addFont('Tinos-Regular.ttf', 'Tinos', 'normal');

            doc.addFileToVFS('Tinos-Bold.ttf', fontBold);
            doc.addFont('Tinos-Bold.ttf', 'Tinos', 'bold');

            doc.addFileToVFS('Tinos-Italic.ttf', fontItalic);
            doc.addFont('Tinos-Italic.ttf', 'Tinos', 'italic');

            doc.addFileToVFS('Tinos-BoldItalic.ttf', fontBoldItalic);
            doc.addFont('Tinos-BoldItalic.ttf', 'Tinos', 'bolditalic');

            fontName = 'Tinos';
        } catch (fontError) {
            console.error('Font loading failed:', fontError);
            alert('Không tải được font Times (Tinos), sẽ dùng font mặc định.');
        }

        const CR = 155; // Center Right Block
        const CC = 105; // Center Page

        doc.setFont(fontName, 'normal');

        // --- Header ---
        doc.setFontSize(12); // Increased from 11
        doc.text("CÔNG TY CỔ PHẦN CẤP NƯỚC BẾN THÀNH", 60, 12, { align: 'center' });
        doc.setFont(fontName, 'bold');
        const textLeft = "ĐỘI QUẢN LÝ GHI THU NƯỚC";
        doc.text(textLeft, 60, 18, { align: 'center' });
        const wLeft = doc.getTextWidth(textLeft);
        doc.line(60 - wLeft / 4, 19, 60 + wLeft / 4, 19);

        doc.setFont(fontName, 'normal');
        doc.text("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", CR, 12, { align: 'center' });
        doc.setFont(fontName, 'bold');
        const textRight = "Độc lập - Tự do - Hạnh phúc";
        doc.text(textRight, CR, 18, { align: 'center' });
        const wRight = doc.getTextWidth(textRight);
        doc.line(CR - wRight / 4, 19, CR + wRight / 4, 19);

        // Date
        doc.setFont(fontName, 'italic');
        doc.setFontSize(12); // Increased from 11
        const today = new Date();
        const dateStr = `TP. Hồ Chí Minh, Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
        doc.text(dateStr, CR, 26, { align: 'center' });

        // --- Title ---
        doc.setFont(fontName, 'bold');
        doc.setFontSize(16); // Increased from 15
        doc.text("GIẤY ĐỀ NGHỊ THU CHI PHÍ MỞ NƯỚC", CC, 38, { align: 'center' });

        doc.setFont(fontName, 'normal');
        doc.setFontSize(13); // Increased from 12
        doc.text("Kính gửi : Phòng Kế Toán - Tài Chính", CC, 45, { align: 'center' });

        // --- Body ---
        const startY = 56;
        const lineH = 8;
        const leftM = 20;

        doc.setFontSize(13); // Increased from 12

        doc.text("Đội ghi thu nước đề nghị Phòng Kế toán - Tài chính thu chi phí đóng mở nước của :", leftM, startY);

        // Name
        doc.text("Khách hàng : ", leftM, startY + lineH);
        doc.setFont(fontName, 'bold');
        doc.text(customer.TenKH?.toUpperCase() || '', leftM + 25, startY + lineH);

        // Address
        doc.setFont(fontName, 'normal');
        doc.text(`Địa chỉ :`, leftM, startY + lineH * 2);
        doc.text(`${customer.SoNha} ${customer.Duong}`, leftM + 25, startY + lineH * 2, { maxWidth: 155 });

        // Danh Ba - Split Label and Value (Bold)
        doc.text(`Danh bạ :`, leftM, startY + lineH * 3);
        doc.setFont(fontName, 'bold');
        doc.text(`${customer.DanhBa}`, leftM + 25, startY + lineH * 3);

        // Amount (Fixed Fee: 230737)
        const amount = 230737;
        const amountStr = new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' vnđ';

        doc.setFont(fontName, 'normal');
        doc.text("Số tiền thu : ", leftM, startY + lineH * 4);
        doc.setFont(fontName, 'bold');
        doc.text(amountStr, leftM + 25, startY + lineH * 4);

        // In words
        doc.setFont(fontName, 'normal');
        doc.text("Bằng chữ : ", leftM, startY + lineH * 5);

        const amountInWords = toVietnameseCurrency(Number(amount));
        doc.setFont(fontName, 'italic');
        doc.text(amountInWords, leftM + 25, startY + lineH * 5, { maxWidth: 155 });

        // Reason
        doc.setFont(fontName, 'normal');
        doc.text("Lý do thu tiền : Chi phí mở nước.", leftM, startY + lineH * 6);

        // --- Signature ---
        const sigY = startY + lineH * 7 + 0;
        doc.setFont(fontName, 'bold');
        doc.text("TỔ TRƯỞNG", CR, sigY, { align: 'center' });

        doc.setFont(fontName, 'bolditalic');
        doc.text("Ngô Hoàng Trung", CR, sigY + 25, { align: 'center' });

        const fileName = `M-${customer.IdTB || customer.DanhBa}-${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '')}.pdf`;

        if (download) {
            doc.save(fileName);
        }

        const pdfBlob = doc.output('blob');
        return { success: true, pdfBlob, fileName };
    } catch (error) {
        console.error('Generate Proposal PDF Error:', error);
        return { success: false, error: String(error) };
    }
}
