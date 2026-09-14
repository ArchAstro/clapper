# RFC8446, August2018, §2 and §4; ordinary server-authenticated ECDHE handshake

Source: https://www.rfc-editor.org/rfc/rfc8446

Pack type: curator-written reference notes, not a verbatim copy of the primary publication. Freeze/approve these notes before confirmatory evaluation.

Scope: TLS1.3 ordinary server-authenticated handshake with ephemeral Diffie-Hellman; exclude PSK resumption,0-RTT and optional client authentication.
ClientHello and ServerHello negotiate parameters and exchange public key shares. Both peers derive shared secrets locally; the private ephemeral keys and final traffic secrets are not transmitted as a session key in the certificate.
The server sends EncryptedExtensions, Certificate, CertificateVerify and Finished. The client validates the certificate and server authentication and verifies Finished, then sends its Finished. Identify the selected handshake's encryption stages carefully.
CertificateVerify signs the handshake transcript using the authentication key; key agreement and signatures have different roles. Finished authenticates the transcript using derived key material. Certificate/path validation and identity checks are necessary for trusting the peer.
Use a source-backed message sequence. Do not mix TLS1.2 RSA key transport with TLS1.3, or claim a certificate itself contains the shared session secret.
