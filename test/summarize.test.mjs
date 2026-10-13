import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../lib/summarize.mjs";

// A made-up REA inspect-android-package result, shaped like JADX 0.7.1 output.
const androidResult = {
  normalized_result: {
    package_name: "com.example.notes",
    version_name: "2.3.0",
    version_code: "230",
    min_sdk: "24",
    target_sdk: "35",
    permissions: ["android.permission.INTERNET", "android.permission.CAMERA", "android.permission.RECEIVE_BOOT_COMPLETED", "com.example.notes.INTERNAL"],
    manifest: {
      text: `<manifest package="com.example.notes"><application>
        <activity android:name="com.example.notes.MainActivity"/>
        <activity android:name=".SettingsActivity"/>
        <receiver android:name="com.example.notes.ReminderReceiver"/>
        <service android:name="androidx.work.impl.background.systemjob.SystemJobService"/>
        <provider android:name="io.flutter.plugins.imagepicker.ImagePickerFileProvider"/>
        <meta-data android:name="io.flutter.embedding.android.NormalTheme"/>
      </application></manifest>`,
    },
    class_count: 1200,
    signature_verification: "not_performed",
  },
};

test("explains an Android manifest in plain Chinese", () => {
  const report = summarize("inspect-android-package", androidResult);
  assert.match(report.headline, /com\.example\.notes/);
  assert.match(report.headline, /Flutter/);
  assert.match(report.headline, /1 项涉及隐私/);
  assert.equal(report.facts.find((f) => f.label === "最低支持").value, "Android 7.0（API 24）");

  const permissions = report.sections.find((s) => s.title === "申请的权限").table.rows;
  assert.deepEqual(permissions[0], ["使用相机", "敏感", "CAMERA"], "sensitive permissions are listed first");
  assert.ok(permissions.some((row) => row[0] === "App 自己定义的内部权限"));

  const own = report.sections.find((s) => s.title === "App 自己写的组件").table.rows;
  assert.deepEqual(own.map((row) => row[0]).sort(), ["MainActivity", "ReminderReceiver", "SettingsActivity"]);

  const libraries = report.sections.find((s) => s.title === "用到的现成能力").table.rows.map((row) => row[0]);
  assert.ok(libraries.includes("后台定时任务（WorkManager）"));
  assert.ok(libraries.includes("从相册或相机选图（Flutter 插件）"));
  assert.ok(report.cautions.some((c) => c.includes("libapp.so")));
});
