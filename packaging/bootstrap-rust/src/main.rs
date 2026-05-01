// slidify-bootstrap — single static binary that materializes a private
// slidify environment on first run and execs the real CLI thereafter.
//
// Lifecycle:
//
//   1. The user installs us via `curl -fsSL https://slidify.sh/install | sh`.
//      The install script drops this binary into ~/.local/bin/slidify.
//
//   2. First invocation: we look for `$SLIDIFY_HOME/env/bin/slidify`. If
//      missing, we provision it: download a portable uv, materialize a
//      pinned Python 3.11, pip-install slidify + the playwright wheel,
//      then `playwright install chromium`. All under ~/.local/share/slidify/.
//
//   3. Steady state: we exec ~/.local/share/slidify/env/bin/slidify with
//      the user's argv unchanged, so the experience is identical to the
//      pip-installed CLI.
//
//   4. `slidify upgrade` re-runs provisioning at the latest version.
//
// This is the "rustup model": tiny, single-binary, but doesn't pretend
// to bundle Chromium or LibreOffice (it can't — they're hundreds of MB
// of native code with their own dynamic dependencies). Instead it makes
// installation a one-liner and surfaces missing system deps clearly.
//
// LibreOffice / Tesseract / poppler remain explicit OS-package
// dependencies. The bootstrap prints a precise apt/brew install line
// when it sees them missing.

use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn slidify_home() -> Result<PathBuf> {
    if let Ok(p) = std::env::var("SLIDIFY_HOME") {
        return Ok(PathBuf::from(p));
    }
    let data = dirs::data_dir().ok_or_else(|| anyhow!("no XDG data dir"))?;
    Ok(data.join("slidify"))
}

fn target_cli(home: &Path) -> PathBuf {
    home.join("env").join("bin").join("slidify")
}

fn provision(home: &Path) -> Result<()> {
    eprintln!("slidify: first-run setup → {}", home.display());

    std::fs::create_dir_all(home).context("creating SLIDIFY_HOME")?;

    // 1. Ensure uv is on PATH (or fetch a portable copy).
    let uv = which("uv").or_else(|_| install_uv(home))?;

    // 2. Create a pinned Python 3.11 venv under $SLIDIFY_HOME/env.
    let env_dir = home.join("env");
    if !env_dir.exists() {
        run(&uv, &["venv", "--python", "3.11", env_dir.to_str().unwrap()])?;
    }

    // 3. Install slidify into the venv. Pin via SLIDIFY_PIN for repro builds.
    let pin = std::env::var("SLIDIFY_PIN").unwrap_or_else(|_| "slidify".into());
    run_with_env(
        &uv,
        &["pip", "install", "--python", env_dir.join("bin/python").to_str().unwrap(), &pin],
        &[("VIRTUAL_ENV", env_dir.to_str().unwrap())],
    )?;

    // 4. Install Playwright Chromium under a stable path.
    let pw_browsers = home.join("pw-browsers");
    std::fs::create_dir_all(&pw_browsers).ok();
    run_with_env(
        env_dir.join("bin/python").to_str().unwrap(),
        &["-m", "playwright", "install", "chromium"],
        &[("PLAYWRIGHT_BROWSERS_PATH", pw_browsers.to_str().unwrap())],
    )?;

    eprintln!("slidify: setup complete.");
    eprintln!("slidify: hint — run `slidify doctor` to verify system deps");
    eprintln!("         (LibreOffice, Tesseract, poppler-utils, fonts-inter).");
    Ok(())
}

fn install_uv(home: &Path) -> Result<PathBuf> {
    let bin_dir = home.join("bin");
    std::fs::create_dir_all(&bin_dir)?;
    let uv_path = bin_dir.join("uv");
    if uv_path.exists() {
        return Ok(uv_path);
    }

    eprintln!("slidify: downloading uv (one-shot, < 20 MB) …");
    let installer_url = "https://astral.sh/uv/install.sh";
    let body = ureq::get(installer_url).call()?.into_string()?;
    // Run the installer with a pinned target dir.
    let status = Command::new("sh")
        .arg("-c")
        .arg(&body)
        .env("UV_INSTALL_DIR", &bin_dir)
        .status()
        .context("running uv install.sh")?;
    if !status.success() {
        return Err(anyhow!("uv installer exited with {status}"));
    }
    if !uv_path.exists() {
        return Err(anyhow!("uv installer did not produce {:?}", uv_path));
    }
    Ok(uv_path)
}

fn which<S: AsRef<str>>(bin: S) -> Result<PathBuf> {
    let path_var = std::env::var_os("PATH").ok_or_else(|| anyhow!("no PATH"))?;
    for dir in std::env::split_paths(&path_var) {
        let candidate = dir.join(bin.as_ref());
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    Err(anyhow!("{} not on PATH", bin.as_ref()))
}

fn run<P: AsRef<Path>>(prog: P, args: &[&str]) -> Result<()> {
    let status = Command::new(prog.as_ref()).args(args).status()?;
    if !status.success() {
        return Err(anyhow!("{:?} exited with {status}", prog.as_ref()));
    }
    Ok(())
}

fn run_with_env<P: AsRef<Path>>(prog: P, args: &[&str], env: &[(&str, &str)]) -> Result<()> {
    let mut cmd = Command::new(prog.as_ref());
    cmd.args(args);
    for (k, v) in env {
        cmd.env(k, v);
    }
    let status = cmd.status()?;
    if !status.success() {
        return Err(anyhow!("{:?} exited with {status}", prog.as_ref()));
    }
    Ok(())
}

fn print_help() {
    eprintln!(
        "slidify-bootstrap {VERSION} — launcher for the slidify CLI

Subcommands handled by the bootstrap itself:
  setup     Provision the private slidify env (idempotent).
  upgrade   Re-provision at the latest version.
  uninstall Remove the private slidify env (does NOT delete this binary).
  where     Print SLIDIFY_HOME.

Every other argv is forwarded verbatim to the real `slidify` CLI.
First run auto-provisions; subsequent runs exec straight through.
Set SLIDIFY_HOME to override the default (~/.local/share/slidify).
"
    );
}

fn main() -> ExitCode {
    let home = match slidify_home() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("slidify: {e}");
            return ExitCode::from(1);
        }
    };

    let args: Vec<String> = std::env::args().skip(1).collect();

    // Bootstrap-only subcommands.
    if let Some(first) = args.first() {
        match first.as_str() {
            "--bootstrap-help" | "--launcher-help" => {
                print_help();
                return ExitCode::SUCCESS;
            }
            "where" => {
                println!("{}", home.display());
                return ExitCode::SUCCESS;
            }
            "uninstall" => {
                if home.exists() {
                    let _ = std::fs::remove_dir_all(&home);
                }
                eprintln!("Removed {}.", home.display());
                eprintln!("This launcher binary is still in place; rm it manually if desired.");
                return ExitCode::SUCCESS;
            }
            "setup" | "upgrade" => {
                if let Err(e) = provision(&home) {
                    eprintln!("slidify: provisioning failed: {e:#}");
                    return ExitCode::from(1);
                }
                return ExitCode::SUCCESS;
            }
            _ => {}
        }
    }

    let cli = target_cli(&home);
    if !cli.exists() {
        if let Err(e) = provision(&home) {
            eprintln!("slidify: provisioning failed: {e:#}");
            return ExitCode::from(1);
        }
    }

    // Inject PLAYWRIGHT_BROWSERS_PATH if we own it but the user hasn't.
    let pw = home.join("pw-browsers");
    if std::env::var_os("PLAYWRIGHT_BROWSERS_PATH").is_none() && pw.exists() {
        std::env::set_var("PLAYWRIGHT_BROWSERS_PATH", &pw);
    }

    // exec the real CLI.
    let status = match Command::new(&cli).args(&args).status() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("slidify: failed to spawn {}: {e}", cli.display());
            return ExitCode::from(1);
        }
    };

    ExitCode::from(status.code().unwrap_or(1) as u8)
}
