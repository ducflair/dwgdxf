use wasm_bindgen::prelude::*;
use std::io::Cursor;
use acadrust::io::dwg::DwgReader;
use acadrust::io::dxf::DxfWriter;

#[wasm_bindgen(js_name = convertDwgToDxf)]
pub fn convert_dwg_to_dxf(dwg_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    let cursor = Cursor::new(dwg_bytes);
    let mut reader = DwgReader::from_stream(cursor);
    let doc = reader.read().map_err(|e| JsValue::from_str(&e.to_string()))?;
    let writer = DxfWriter::new(&doc);
    let dxf_bytes = writer.write_to_vec().map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(dxf_bytes)
}
