using System.IO;
using System.Runtime.InteropServices.JavaScript;
using ACadSharp.IO;

namespace DwgDxf;

/// <summary>
/// Client-side DWG → DXF converter exposed to JavaScript via [JSExport].
/// The class must be partial for the source-generated interop glue.
/// </summary>
public static partial class Converter
{
    /// <summary>
    /// Converts a DWG binary buffer to DXF bytes.
    /// On the JS side this maps to: Uint8Array → Uint8Array.
    /// </summary>
    [JSExport]
    public static byte[] ConvertDwgToDxf(byte[] dwgBytes)
    {
        using var dwgStream = new MemoryStream(dwgBytes, writable: false);
        var document = DwgReader.Read(dwgStream, null);

        using var dxfStream = new MemoryStream();
        using var writer = new DxfWriter(dxfStream, document, false);
        writer.Configuration.CloseStream = false;
        writer.Write();

        return dxfStream.ToArray();
    }
}
