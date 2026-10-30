import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_engine
from app.models import User


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Grant or revoke EduLens administrator access."
    )
    parser.add_argument("action", choices=["grant", "revoke"])
    args = parser.parse_args()

    email = input("Existing account email: ").strip().lower()

    with Session(get_engine()) as session:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            raise SystemExit("Account not found. No changes made.")

        if args.action == "grant" and not user.is_active:
            raise SystemExit("Cannot grant access to an inactive account.")

        user.is_admin = args.action == "grant"
        session.commit()
        print(f"Administrator access {args.action} completed.")


if __name__ == "__main__":
    main()
