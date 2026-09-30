use tauri_build::{try_build, Attributes};

fn main() {
    let mut attrs = Attributes::new();
    attrs = attrs.window("main", |w| {
        w.title("Timbre Escolar Inteligente")
            .width(1280)
            .height(800)
            .min_width(1024)
            .min_height(768)
            .resizable(true)
            .center()
            .title_bar_style(tauri_build::TitleBarStyle::Visible)
            .visible(true)
    });
    
    try_build(attrs).expect("Failed to build Tauri attributes");
}