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
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=VYRA_{#MyAppVersion}_Setup
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

; Modern look
WindowVisible=yes
WindowShowCaption=yes
WindowResizable=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Main executable from Tauri build
Source: "..\src-tauri\target\release\vyra.exe"; DestDir: "{app}"; DestName: "VYRA.exe"; Flags: ignoreversion
; Resources folder
Source: "..\src-tauri\target\release\resources\*"; DestDir: "{app}\resources"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
; WebView2 bootstrapper (download from Microsoft)
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Install WebView2 if not present
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "Installing WebView2 Runtime..."; Flags: waituntilterminated skipifdoesntexist
; Launch app after install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function IsWebView2Installed(): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
            RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
            RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version);
end;

function FindAndUninstallTauri(): Boolean;
var
  UninstallKey: String;
  UninstallString: String;
  ResultCode: Integer;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\VYRA';
  
  if RegQueryStringValue(HKCU, UninstallKey, 'UninstallString', UninstallString) then
  begin
    if UninstallString <> '' then
    begin
      if Copy(UninstallString, 1, 1) = '"' then
        UninstallString := Copy(UninstallString, 2, Length(UninstallString) - 2);
      Exec(UninstallString, '/SILENT', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end
  else if RegQueryStringValue(HKLM, UninstallKey, 'UninstallString', UninstallString) then
  begin
    if UninstallString <> '' then
    begin
      if Copy(UninstallString, 1, 1) = '"' then
        UninstallString := Copy(UninstallString, 2, Length(UninstallString) - 2);
      Exec(UninstallString, '/SILENT', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

function FindAndUninstallInno(): Boolean;
var
  UninstallKey: String;
  UninstallString: String;
  ResultCode: Integer;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}_is1';
  
  if RegQueryStringValue(HKCU, UninstallKey, 'UninstallString', UninstallString) then
  begin
    if UninstallString <> '' then
    begin
      if Copy(UninstallString, 1, 1) = '"' then
        UninstallString := Copy(UninstallString, 2, Length(UninstallString) - 2);
      Exec(UninstallString, '/SILENT /NORESTART', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end
  else if RegQueryStringValue(HKLM, UninstallKey, 'UninstallString', UninstallString) then
  begin
    if UninstallString <> '' then
    begin
      if Copy(UninstallString, 1, 1) = '"' then
        UninstallString := Copy(UninstallString, 2, Length(UninstallString) - 2);
      Exec(UninstallString, '/SILENT /NORESTART', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  FindAndUninstallTauri();
  FindAndUninstallInno();
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Check if WebView2 needs to be installed
    if not IsWebView2Installed() then
    begin
      if FileExists(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe')) then
      begin
        Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;
    end;
  end;
end;
