from db import clear_all_data, init_db


def main() -> None:
    init_db()
    clear_all_data()
    print("All events and alerts cleared from database.")


if __name__ == "__main__":
    main()
