from app import app

if __name__ == "__main__":
    # Add comment to explain this file is deprecated
    print("WARNING: main.py is deprecated, please use 'python app.py' instead")
    app.run(host="0.0.0.0", port=5000, debug=True)