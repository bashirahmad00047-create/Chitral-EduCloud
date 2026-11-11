import sys
import io
import base64
import qrcode

def generate_qr_base64(text):
    """Generate authentic, high-density, scannable QR Code PNG Data URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3
    )
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#064e3b", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

if __name__ == '__main__':
    text = sys.argv[1] if len(sys.argv) > 1 else 'chitral_baileys_test'
    print(generate_qr_base64(text))
