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

import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";

const theme = createTheme({
  primaryColor: "paperpost",
  primaryShade: 9,
  fontFamily: "var(--pp-font-sans)",
  fontFamilyMonospace: "var(--pp-font-mono)",
  defaultRadius: "sm",
  focusRing: "auto",
  respectReducedMotion: true,
  colors: {
    paperpost: [
      "#eefcf8",
      "#def5ef",
      "#b7ecdd",
      "#8de3cb",
      "#6cdbbb",
      "#58d6b1",
      "#4dd4ac",
      "#23b38c",
      "#32a785",
      "#135e4a",
    ],
  },
  fontSizes: { xs: "11px", sm: "12px", md: "14px", lg: "16px", xl: "17px" },
  radius: { xs: "2px", sm: "2px", md: "4px", lg: "4px", xl: "4px" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "32px" },
  headings: {
    fontFamily: "var(--pp-font-sans)",
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "32px", lineHeight: "1.3" },
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
    "--mantine-color-error": "var(--pp-status-danger)",
    "--mantine-color-red-light": "var(--pp-status-danger-bg)",
    "--mantine-color-red-light-color": "var(--pp-status-danger)",
    "--mantine-color-yellow-light": "var(--pp-status-warning-bg)",
    "--mantine-color-yellow-light-color": "var(--pp-status-warning)",
    "--mantine-color-body": "var(--pp-surface-canvas)",
    "--mantine-color-text": "var(--pp-text-primary)",
    "--mantine-color-dimmed": "var(--pp-text-secondary)",
    "--mantine-color-default": "var(--pp-surface-default)",
    "--mantine-color-default-border": "var(--pp-border-default)",
    "--mantine-color-default-hover": "var(--pp-action-subtle)",
    "--mantine-color-paperpost-filled": "var(--pp-action-primary)",
    "--mantine-color-paperpost-filled-hover": "var(--pp-action-primary-hover)",
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
