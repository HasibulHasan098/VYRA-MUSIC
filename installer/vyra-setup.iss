; VYRA Custom Installer Script for Inno Setup
; Download Inno Setup from: https://jrsoftware.org/isinfo.php

#define MyAppName "VYRA"
#define MyAppVersion "1.0.4"
#define MyAppPublisher "FASTHAND"
#define MyAppURL "https://github.com/HasibulHasan098/VYRA-MUSIC"
#define MyAppExeName "VYRA.exe"

[Setup]
; Basic info
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Remove license page - auto accept
; LicenseFile=..\LICENSE
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=VYRA_{#MyAppVersion}_Setup
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

; Custom appearance
WizardImageFile=wizard-image.bmp
WizardSmallImageFile=wizard-small.bmp
WizardImageStretch=yes

; Modern look
WindowVisible=yes
WindowShowCaption=yes
WindowResizable=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Main executable and resources from Tauri build
Source: "..\src-tauri\target\release\VYRA.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src-tauri\target\release\*.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function GetUninstallString(AppId: String): String;
var
  UninstallKey: String;
  UninstallString: String;
begin
  Result := '';
  // Check current user first
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + AppId + '_is1';
  if RegQueryStringValue(HKCU, UninstallKey, 'UninstallString', UninstallString) then
    Result := UninstallString
  else if RegQueryStringValue(HKLM, UninstallKey, 'UninstallString', UninstallString) then
    Result := UninstallString;
end;

function UninstallOldVersion(AppId: String): Boolean;
var
  UninstallString: String;
  ResultCode: Integer;
begin
  Result := True;
  UninstallString := GetUninstallString(AppId);
  if UninstallString <> '' then
  begin
    // Remove quotes if present
    if Copy(UninstallString, 1, 1) = '"' then
      UninstallString := Copy(UninstallString, 2, Length(UninstallString) - 2);
    // Run uninstaller silently
    Result := Exec(UninstallString, '/SILENT /NORESTART', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  // Uninstall old Inno Setup version (same AppId)
  UninstallOldVersion('{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}');
  // Also try to uninstall Tauri/NSIS version if exists
  UninstallOldVersion('VYRA');
  UninstallOldVersion('com.vyra.desktop');
end;
