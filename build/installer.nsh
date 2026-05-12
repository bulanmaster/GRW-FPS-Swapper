!macro customInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Create a desktop shortcut for ${PRODUCT_NAME}?" /SD IDYES IDNO skip_desktop_shortcut
    CreateShortCut "$DESKTOP\${PRODUCT_FILENAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  skip_desktop_shortcut:
!macroend
