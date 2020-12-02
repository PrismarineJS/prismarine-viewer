import socket
import cv2
import numpy as np

HOST = ''
PORT = 8089

def recvall(sock, count):
    buf = b''
    while count:
        newbuf = sock.recv(count)
        if not newbuf: return None
        buf += newbuf
        count -= len(newbuf)
    return buf

def recvint(sock): return int.from_bytes(recvall(sock, 4), byteorder='little')

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print('Socket created')

s.bind((HOST,PORT))
print('Socket bind complete')
s.listen(10)
print('Socket now listening')

conn, addr=s.accept()

print('Socket connected')

out = cv2.VideoWriter('out.mp4', cv2.VideoWriter_fourcc(*'XVID'), 20, (512, 512))

while True:
    length = recvint(conn)
    stringData = recvall(conn, int(length))
    img = cv2.imdecode(np.fromstring(stringData, dtype = np.uint8), cv2.IMREAD_UNCHANGED)

    # example processing
    edges = cv2.Canny(img, 100, 200)

    cv2.imshow('frame', img)
    out.write(img)

    key = cv2.waitKey(1)
    conn.send(str(key).encode())

    if key == ord('q'): break

out.release()
