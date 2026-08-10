; Optional "Open with" associations for video files (he/en).
!ifndef BUILD_UNINSTALLER
  !include "nsDialogs.nsh"
  !include "LogicLib.nsh"

  Var AssociateVideoFiles
  Var AssociateVideoCheckbox

  !macro customInit
    ; Checked by default; remember the previous choice across upgrades.
    StrCpy $AssociateVideoFiles "1"
    ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" AssociateVideoFiles
    ${If} $0 == "0"
      StrCpy $AssociateVideoFiles "0"
    ${ElseIf} $0 == "1"
      StrCpy $AssociateVideoFiles "1"
    ${Else}
      ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" AssociateVideoFiles
      ${If} $0 == "0"
        StrCpy $AssociateVideoFiles "0"
      ${ElseIf} $0 == "1"
        StrCpy $AssociateVideoFiles "1"
      ${EndIf}
    ${EndIf}
  !macroend

  !macro customPageAfterChangeDir
    Page custom createAssociateVideoPage leaveAssociateVideoPage

    Function createAssociateVideoPage
      ${If} ${isUpdated}
        Abort
      ${EndIf}

      nsDialogs::Create 1018
      Pop $0
      ${If} $0 == error
        Abort
      ${EndIf}

      StrCpy $R8 "File associations"
      StrCpy $R9 "Choose whether to add the app to Open with for video files"
      StrCpy $R7 "Add FMP Video Player to the $\"Open with$\" menu for video files"

      ; 1037 = Hebrew
      ${If} $LANGUAGE == 1037
        StrCpy $R8 "שיוך קבצים"
        StrCpy $R9 "בחרו האם להוסיף את התוכנה לתפריט פתח באמצעות עבור קבצי וידאו"
        StrCpy $R7 "הוסף את FMP Video Player לתפריט $\"פתח באמצעות$\" עבור קבצי וידאו"
      ${EndIf}

      !insertmacro MUI_HEADER_TEXT "$R8" "$R9"

      ${NSD_CreateCheckbox} 0 40u 100% 24u "$R7"
      Pop $AssociateVideoCheckbox

      ${If} $AssociateVideoFiles == "1"
        ${NSD_Check} $AssociateVideoCheckbox
      ${Else}
        ${NSD_Uncheck} $AssociateVideoCheckbox
      ${EndIf}

      nsDialogs::Show
    FunctionEnd

    Function leaveAssociateVideoPage
      ${NSD_GetState} $AssociateVideoCheckbox $0
      ${If} $0 == ${BST_CHECKED}
        StrCpy $AssociateVideoFiles "1"
      ${Else}
        StrCpy $AssociateVideoFiles "0"
      ${EndIf}
    FunctionEnd
  !macroend

  !macro customInstall
    WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" AssociateVideoFiles "$AssociateVideoFiles"

    ; electron-builder always registers associations when configured; undo if unchecked.
    ${If} $AssociateVideoFiles != "1"
      !ifmacrodef unregisterFileAssociations
        !insertmacro unregisterFileAssociations
      !endif
    ${EndIf}
  !macroend
!endif
