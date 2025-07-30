import PyInstaller.__main__
import os
import shutil

# --- Configuration ---
SCRIPT_NAME = 'windows_client.py'  # The name of your main GUI script
EXE_NAME = 'intruder_client'       # The desired name for the final .exe file
ICON_FILE = 'icon.ico'             # The name of your icon file
DATA_TO_INCLUDE = [
    # Add any other data files here if needed, e.g., ('path/to/your/file', 'destination/folder')
]

# --- Build Process ---
def build_executable():
    """
    Uses PyInstaller to build the standalone Windows executable.
    """
    print("--- Starting iNTRUDER Windows Client build process ---")

    if not os.path.exists(SCRIPT_NAME):
        print(f"ERROR: Main script '{SCRIPT_NAME}' not found. Aborting.")
        return

    if not os.path.exists(ICON_FILE):
        print(f"WARNING: Icon file '{ICON_FILE}' not found. A default icon will be used.")
        icon_option = ""
    else:
        icon_option = f"--icon={ICON_FILE}"

    # Construct the PyInstaller command
    # --onefile: Bundles everything into a single .exe
    # --windowed: Prevents a console window from appearing when the GUI is run
    # --name: Sets the output file name
    # --icon: Sets the custom icon
    pyinstaller_args = [
        '--onefile',
        '--windowed',
        f'--name={EXE_NAME}',
        icon_option,
    ]

    # Add any extra data files
    for data_src, data_dest in DATA_TO_INCLUDE:
        pyinstaller_args.append(f'--add-data={data_src}{os.pathsep}{data_dest}')
    
    # Add the main script to the command
    pyinstaller_args.append(SCRIPT_NAME)

    print(f"Running PyInstaller with arguments: {' '.join(pyinstaller_args)}")

    try:
        PyInstaller.__main__.run(pyinstaller_args)
        print("\n--- Build Successful! ---")
        print(f"Your executable can be found in the '{os.path.join(os.getcwd(), 'dist')}' directory.")
    except Exception as e:
        print(f"\n--- Build Failed! ---")
        print(f"An error occurred during the build process: {e}")
    finally:
        # Clean up temporary build files
        print("Cleaning up temporary build files...")
        if os.path.exists(f'{EXE_NAME}.spec'):
            os.remove(f'{EXE_NAME}.spec')
        if os.path.exists('build'):
            shutil.rmtree('build')
        print("Cleanup complete.")


if __name__ == '__main__':
    build_executable()
