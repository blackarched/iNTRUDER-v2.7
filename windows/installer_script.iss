; iNTRUDER v2.6 - Inno Setup Installer Script

[Setup]
; NOTE: The AppId is a unique identifier for your application.
; It's recommended to generate a new GUID for your own projects.
AppId={{F2A4E9B3-7281-4D56-8D8A-7C1E12A3E1B5}}
AppName=iNTRUDER C2 Client
AppVersion=2.6
AppPublisher=Spectre-7 Operations
DefaultDirName={autopf}\iNTRUDER Client
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=intruder_setup
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; This line tells the installer to take the executable we built with PyInstaller
; and place it in the application's installation directory.
Source: "dist\intruder_client.exe"; DestDir: "{app}"; Flags: ignoreversion
; Add any other files your client might need here. For example:
; Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Icon for the Start Menu
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#ExeName}"
; The desktop shortcut, created if the user checks the box during installation
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#ExeName}"; Tasks: desktopicon

[Run]
; Optionally, run the application immediately after installation finishes.
Filename: "{app}\{#ExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
