from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os


def get_encryption_key() -> bytes:
    """
    Get or generate encryption key for password encryption.
    In production, this should be stored securely (e.g., environment variable).
    """
    key_str = os.getenv("ENCRYPTION_KEY")

    if not key_str:
        # Generate a key from a secret
        secret = os.getenv("SECRET_KEY", "default-secret-change-this")
        salt = b"health-tracker-salt"  # In production, use a random salt and store it

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
        return key

    return key_str.encode()


def encrypt_password(password: str) -> str:
    """
    Encrypt a password using Fernet symmetric encryption.

    Args:
        password: Plain text password

    Returns:
        Encrypted password as string
    """
    key = get_encryption_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(password.encode())
    return encrypted.decode()


def decrypt_password(encrypted_password: str) -> str:
    """
    Decrypt a password.

    Args:
        encrypted_password: Encrypted password string

    Returns:
        Plain text password
    """
    key = get_encryption_key()
    fernet = Fernet(key)
    decrypted = fernet.decrypt(encrypted_password.encode())
    return decrypted.decode()
