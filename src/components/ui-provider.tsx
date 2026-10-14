"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Input,
  InputWrapper,
  MantineProvider,
  NativeSelect,
  Paper,
  Tabs,
  TextInput,
  Textarea,
  createTheme,
  type CSSVariablesResolver,
} from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./ui-theme.module.css";

const theme = createTheme({
  primaryColor: "paperpost",
  primaryShade: 6,
  fontFamily: "var(--pp-font-sans)",
  fontFamilyMonospace: "var(--pp-font-mono)",
  defaultRadius: "sm",
  focusRing: "auto",
  respectReducedMotion: true,
  colors: {
    paperpost: [
      "#eaf0ff", "#d5dfff", "#bbcaff", "#97aff3", "#7493ec",
      "#5275e3", "#3159d8", "#294bb8", "#233f9a", "#1d347c",
    ],
  },
  fontSizes: { xs: "11px", sm: "12px", md: "14px", lg: "16px", xl: "17px" },
  radius: { xs: "3px", sm: "4px", md: "8px", lg: "8px", xl: "8px" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "32px" },
  headings: {
    fontFamily: "var(--pp-font-sans)",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "25px", lineHeight: "1.3" },
      h2: { fontSize: "17px", lineHeight: "1.5" },
      h3: { fontSize: "16px", lineHeight: "1.5" },
    },
  },
  components: {
    Button: Button.extend({
      defaultProps: { variant: "default", size: "sm" },
      classNames: { root: classes.button },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: "subtle", size: "md" },
      classNames: { root: classes.actionIcon },
    }),
    Input: Input.extend({ classNames: { input: classes.input } }),
    InputWrapper: InputWrapper.extend({ classNames: { label: classes.label } }),
    TextInput: TextInput.extend({ defaultProps: { size: "sm" } }),
    NativeSelect: NativeSelect.extend({ defaultProps: { size: "sm" } }),
    Textarea: Textarea.extend({ defaultProps: { size: "sm" } }),
    Checkbox: Checkbox.extend({
      defaultProps: { size: "xs" },
      classNames: { label: classes.checkboxLabel },
    }),
    Tabs: Tabs.extend({
      classNames: { tab: classes.tab, list: classes.tabList },
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light", radius: "sm" },
      classNames: { root: classes.badge },
    }),
    Paper: Paper.extend({ defaultProps: { radius: "md" } }),
    Alert: Alert.extend({
      defaultProps: { variant: "light", radius: "sm" },
      classNames: { root: classes.alert, message: classes.alertMessage },
    }),
  },
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-body": "var(--pp-surface-canvas)",
    "--mantine-color-text": "var(--pp-text-primary)",
    "--mantine-color-dimmed": "var(--pp-text-secondary)",
    "--mantine-color-default": "var(--pp-surface-default)",
    "--mantine-color-default-border": "var(--pp-border-default)",
    "--mantine-color-default-hover": "var(--pp-action-subtle)",
    "--mantine-color-paperpost-filled": "var(--pp-action-primary)",
    "--mantine-color-paperpost-light": "var(--pp-action-subtle)",
    "--mantine-color-paperpost-light-color": "var(--pp-action-primary)",
  },
  dark: {},
});

export default function UiProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="light"
      cssVariablesResolver={cssVariablesResolver}
    >
      {children}
    </MantineProvider>
  );
}
