
const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';

const chuHangDonVi = ('1 một' + defaultNumbers).split(' ');
const chuHangChuc = ('lẻ mười' + defaultNumbers).split(' ');
const chuHangTram = ('không một' + defaultNumbers).split(' ');

function convertBlockThree(number: string) {
    if (number == '000') return '';
    var _a = number + ''; //Convert variable 'number' to string

    switch (_a.length) {
        case 0: return '';
        case 1: return chuHangDonVi[parseInt(_a)];
        case 2: return convertBlockTwo(_a);
        case 3:
            var chuc_dv = '';
            if (_a.slice(1, 3) != '00') {
                chuc_dv = convertBlockTwo(_a.slice(1, 3));
            }
            var tram = chuHangTram[parseInt(_a[0])] + ' trăm';
            return tram + ' ' + chuc_dv;
    }
}

function convertBlockTwo(number: string) {
    var dv = chuHangDonVi[parseInt(number[1])];
    var chuc = chuHangChuc[parseInt(number[0])];
    var append = '';

    // Nếu chữ số hàng đơn vị là 5
    if (number[0] > '0' && number[1] == '5') {
        dv = 'lăm'
    }

    // Nếu số hàng chục lớn hơn 1
    if (number[0] > '1') {
        append = ' mươi';
        if (number[1] == '1') {
            dv = 'mốt';
        }
    }

    return chuc + append + ' ' + dv;
}

const dvBlock = '1 nghìn triệu tỷ'.split(' ');

export function toVietnameseCurrency(number: number | string) {
    const str = number.toString().replace(/[.,]/g, '');
    let i = 0;
    let arr = [];
    let index = str.length;
    let result = [];
    let rsString = '';

    if (index == 0 || str == '0') {
        return 'Không đồng';
    }

    // Chia chuỗi số thành các nhóm 3 số
    while (index >= 0) {
        arr.push(str.substring(index, Math.max(index - 3, 0)));
        index -= 3;
    }

    // Lặp qua các nhóm 3 số
    for (i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != '' && arr[i] != '000') {
            result.push(convertBlockThree(arr[i]));

            // Thêm đơn vị hàng nghìn, triệu, tỷ,...
            if (dvBlock[i]) {
                result.push(dvBlock[i]);
            }
        }
    }

    // Xóa các khoảng trắng thừa
    rsString = result.join(' ').replace(/[0-9]/g, '').replace(/  /g, ' ').replace(/ $/, '');
    rsString = rsString.trim().charAt(0).toUpperCase() + rsString.trim().slice(1);

    // Thêm chữ "đồng" cuối cùng
    return rsString + ' đồng';
}
