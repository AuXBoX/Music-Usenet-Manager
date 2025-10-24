; Custom NSIS installer script for Music Usenet Manager
; This script adds custom options for auto-start and user data handling

!macro customInstall
  ; Add option to run at Windows startup
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MusicUsenetManager" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

!macro customUnInstall
  ; Remove from Windows startup
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MusicUsenetManager"
!macroend

; Custom page for user data handling during uninstall
Var Dialog
Var Label
Var CheckBox
Var CheckBox_State

!macro customUninstallPage
  Function un.CustomUninstallPage
    !insertmacro MUI_HEADER_TEXT "Uninstall Options" "Choose whether to keep your data"
    
    nsDialogs::Create 1018
    Pop $Dialog
    
    ${If} $Dialog == error
      Abort
    ${EndIf}
    
    ${NSD_CreateLabel} 0 0 100% 24u "Do you want to keep your application data (database, configuration, logs)?"
    Pop $Label
    
    ${NSD_CreateCheckBox} 0 30u 100% 12u "Keep my data (recommended if reinstalling)"
    Pop $CheckBox
    ${NSD_SetState} $CheckBox ${BST_CHECKED}
    
    nsDialogs::Show
  FunctionEnd
  
  Function un.CustomUninstallPageLeave
    ${NSD_GetState} $CheckBox $CheckBox_State
  FunctionEnd
  
  ; Insert the custom page before the uninstall confirmation
  !insertmacro MUI_UNPAGE_CUSTOM un.CustomUninstallPage un.CustomUninstallPageLeave
!macroend

; Custom uninstall logic to handle user data
!macro customRemoveFiles
  ${If} $CheckBox_State == ${BST_UNCHECKED}
    ; User chose to remove data
    RMDir /r "$APPDATA\music-usenet-manager"
  ${EndIf}
!macroend
