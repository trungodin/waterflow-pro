'use server'

import nodemailer from 'nodemailer'

export interface MailRow {
    email: string
    file: string      // Tên file(s), ngăn cách bởi "-"
    cc: string
    group: number
}

export interface SendMailPayload {
    ky: string        // VD: "3/2026"
    dot: number       // Đợt HĐ: 1-12
    rows: MailRow[]
    pdfFiles: { name: string; base64: string }[]
    senderEmail?: string   // Override .env nếu nhập trực tiếp từ UI
    senderPassword?: string
}

export interface SendProgress {
    total: number
    sent: number
    failed: number
    log: string[]
}

export async function sendBulkEmails(payload: SendMailPayload): Promise<{
    success: boolean
    sent: number
    failed: number
    errors: string[]
}> {
    const { ky, dot, rows, pdfFiles } = payload

    // UI override > .env > empty
    const senderEmail = (payload.senderEmail?.trim()) || process.env.MAIL_SENDER || ''
    const senderPassword = (payload.senderPassword?.trim()) || process.env.MAIL_PASSWORD || ''

    if (!senderEmail || !senderPassword) {
        return { success: false, sent: 0, failed: 0, errors: ['Chưa có thông tin email/mật khẩu. Vui lòng nhập vào phần Cấu hình Email.'] }
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: senderEmail, pass: senderPassword },
    })


    // Build a map of filename → base64 content (lower-cased for matching)
    const pdfMap = new Map<string, Buffer>()
    for (const f of pdfFiles) {
        pdfMap.set(f.name.toLowerCase().trim(), Buffer.from(f.base64, 'base64'))
    }

    const signature = `
  <p style="font-family: Times New Roman, sans-serif; font-size: 16px;">
    Kính chào quý khách hàng,<br>
    Công ty Cổ phần Cấp nước Bến Thành kính gửi giấy báo tiền nước kỳ <strong>${ky}</strong>.<br>
    <span style="color: red;"><strong>Quý khách hàng vui lòng thanh toán đúng hạn.<br>
    Để cho việc lấy hóa đơn điện tử được nhanh chóng nhất, quý khách hàng có thể thanh toán qua 2 ngân hàng sau:<br>
      &nbsp;&nbsp;- Số tài khoản: <span style="color: blue;">0461000514782</span> tại Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank) - Chi nhánh Sống Thần.<br>
      &nbsp;&nbsp;- Số tài khoản: <span style="color: blue;">116000113329</span> tại Ngân hàng TMCP Công thương Việt Nam (VietinBank) – Chi nhánh 03.<br>
    Khi thanh toán, quý khách hàng vui lòng ghi đầy đủ mã danh bộ ở đầu ô nội dung để cho việc giải ngân được nhanh chóng nhất.</strong></span><br>
    Email này được gửi từ hệ thống tự động. Xin không reply email này.<br>
    Mọi thắc mắc về việc chuyển khoản xin vui lòng liên hệ trực tiếp qua số điện thoại:
    <span style="color: purple;"><em>028 38 234 708</em></span>
    hoặc qua email: <span style="color: green;"><em><a href="mailto:togiaingan@gmail.com">togiaingan@gmail.com</a></em></span>.<br>
    <strong><em>Xin trân trọng cảm ơn.<br>
    <span style="color: orange;">Tên công ty &nbsp;:</span> <span style="color: blue;">Công ty Cổ phần Cấp nước Bến Thành</span><br>
    <span style="color: orange;">Phòng &nbsp;&nbsp;&nbsp;:</span> Đội Quản lý Ghi thu nước<br>
    <span style="color: orange;">Địa chỉ &nbsp;&nbsp;&nbsp;:</span> 194 Pasteur, Phường Võ Thị Sáu, Quận 3, TPHCM, VN<br>
    <span style="color: orange;">Điện thoại &nbsp;:</span> (028) 38 234 708<br>
    <span style="color: orange;">Email &nbsp;&nbsp;&nbsp;:</span> <a href="mailto:togiaingan@gmail.com">togiaingan@gmail.com</a><br>
    <span style="color: orange;">Website &nbsp;&nbsp;:</span> <a href="http://capnuocbenthanh.com/">http://capnuocbenthanh.com/</a>
    </em></strong>
  </p>`

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Filter only rows in the selected đợt
    const targetRows = rows.filter(r => r.group === dot && r.email && r.file)

    for (const row of targetRows) {
        try {
            const fileNames = row.file.split('-').map(f => f.trim()).filter(Boolean)
            const attachments = fileNames
                .map(fn => {
                    const buf = pdfMap.get(fn.toLowerCase())
                    if (!buf) return null
                    return {
                        filename: fn,
                        content: buf,
                        contentType: 'application/pdf',
                    }
                })
                .filter((a): a is { filename: string; content: Buffer; contentType: string } => a !== null)

            const ccList = row.cc
                ? row.cc.split(';').map(c => c.trim()).filter(Boolean)
                : undefined

            await transporter.sendMail({
                from: `"Cấp Nước Bến Thành" <${senderEmail}>`,
                to: row.email,
                cc: ccList,
                subject: `Giấy báo tiền nước Kỳ ${ky}`,
                html: signature,
                attachments,
            })
            sent++

            // 1.5s delay between emails to avoid Gmail rate limit
            await new Promise(r => setTimeout(r, 1500))
        } catch (err: any) {
            failed++
            errors.push(`${row.email}: ${err.message}`)
        }
    }

    return { success: true, sent, failed, errors }
}
