; NSIS hooks for VYRA installer
; Uninstall old Inno Setup versions before installing

!macro NSIS_HOOK_PREINSTALL
  ; Check and uninstall Inno Setup version from HKCU
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}_is1" "UninstallString"
  StrCmp $R0 "" +3 0
    DetailPrint "Uninstalling old Inno Setup version..."
    ExecWait '$R0 /SILENT /NORESTART' $R1
  
  ; Check and uninstall Inno Setup version from HKLM  
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}_is1" "UninstallString"
  StrCmp $R0 "" +3 0
    DetailPrint "Uninstalling old Inno Setup version..."
    ExecWait '$R0 /SILENT /NORESTART' $R1
!macroend
