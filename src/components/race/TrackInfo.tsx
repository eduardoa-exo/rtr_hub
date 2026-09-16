import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, Map, Loader2, Upload, X, Thermometer, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/r2Upload";
import { compressImage } from "@/lib/compressImage";
import type { Database } from "@/integrations/supabase/types";

type TrackInfoRow = Database["public"]["Tables"]["track_info"]["Row"];
type ImageRow = Database["public"]["Tables"]["images"]["Row"];

type TrackInfoType = TrackInfoRow & {
  weather_image?: ImageRow;
  track_map?: ImageRow;
  temperature_chart_image?: ImageRow;
  precip_chart_image?: ImageRow;
};

interface TrackInfoProps {
  raceId?: string;
}

export function TrackInfo({ raceId }: TrackInfoProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<TrackInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"weather" | "map" | "tempChart" | "precipChart" | null>(null);
  const [expandedImage, setExpandedImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const weatherInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const tempChartInputRef = useRef<HTMLInputElement>(null);
  const precipChartInputRef = useRef<HTMLInputElement>(null);

  const fetchInfo = async () => {
    if (!raceId) {
      setLoading(false);
      return;
    }

    const { data: trackInfoData, error: trackInfoError } = await supabase
      .from("track_info")
      .select("*")
      .eq("race_id", raceId)
      .maybeSingle();

    if (trackInfoError || !trackInfoData) {
      setLoading(false);
      return;
    }

    const imageIds: string[] = [];
    if (trackInfoData.weather_image_id) imageIds.push(trackInfoData.weather_image_id);
    if (trackInfoData.track_map_id) imageIds.push(trackInfoData.track_map_id);
    if (trackInfoData.temperature_chart_image_id) imageIds.push(trackInfoData.temperature_chart_image_id);
    if (trackInfoData.precip_chart_image_id) imageIds.push(trackInfoData.precip_chart_image_id);

    let weatherImage: ImageRow | undefined;
    let trackMap: ImageRow | undefined;
    let temperatureChartImage: ImageRow | undefined;
    let precipChartImage: ImageRow | undefined;

    if (imageIds.length > 0) {
      const { data: imagesData } = await supabase
        .from("images")
        .select("*")
        .in("id", imageIds);

      if (imagesData) {
        weatherImage = imagesData.find((img) => img.id === trackInfoData.weather_image_id);
        trackMap = imagesData.find((img) => img.id === trackInfoData.track_map_id);
        temperatureChartImage = imagesData.find((img) => img.id === trackInfoData.temperature_chart_image_id);
        precipChartImage = imagesData.find((img) => img.id === trackInfoData.precip_chart_image_id);
      }
    }

    setInfo({
      ...trackInfoData,
      weather_image: weatherImage,
      track_map: trackMap,
      temperature_chart_image: temperatureChartImage,
      precip_chart_image: precipChartImage,
    } as TrackInfoType);

    setLoading(false);
  };

  useEffect(() => {
    fetchInfo();
  }, [raceId]);

  const handleUpload = async (
    file: File,
    type: "weather" | "map" | "tempChart" | "precipChart"
  ) => {
    if (!raceId) {
      toast({
        title: "Erro",
        description: "Corrida não encontrada.",
        variant: "destructive",
      });
      return;
    }

    setUploading(type);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { file: compressed } = await compressImage(file, {
        maxEdge: type === "map" ? 1600 : 1920,
        quality: 0.8,
      });

      const uploadType =
        type === "map" || type === "tempChart" || type === "precipChart"
          ? "map"
          : "weather";
      const { publicUrl, key } = await uploadMedia({
        file: compressed,
        type: uploadType,
        authToken: session.access_token,
        entityId: raceId,
      });

      const descriptions: Record<typeof type, string> = {
        weather: "Weather forecast",
        map: "Track map",
        tempChart: "Temperature chart",
        precipChart: "Rain and clouds chart",
      };
      const categories: Record<typeof type, string> = {
        weather: "weather",
        map: "track-map",
        tempChart: "temperature-chart",
        precipChart: "precip-chart",
      };
      const updateFields: Record<typeof type, "weather_image_id" | "track_map_id" | "temperature_chart_image_id" | "precip_chart_image_id"> = {
        weather: "weather_image_id",
        map: "track_map_id",
        tempChart: "temperature_chart_image_id",
        precipChart: "precip_chart_image_id",
      };

      const { data: imageData, error: imageError } = await supabase
        .from("images")
        .insert({
          storage_path: key,
          url: publicUrl,
          filename: compressed.name,
          mime_type: compressed.type,
          size_bytes: compressed.size,
          description: descriptions[type],
          category: categories[type],
        })
        .select()
        .single();

      if (imageError) throw imageError;

      const updateField = updateFields[type];

      const { data: existingInfo } = await supabase
        .from("track_info")
        .select("id")
        .eq("race_id", raceId)
        .maybeSingle();

      if (existingInfo) {
        // Atualizar
        const { error: updateError } = await supabase
          .from("track_info")
          .update({ [updateField]: imageData.id })
          .eq("id", existingInfo.id);

        if (updateError) throw updateError;
      } else {
        // Criar novo
        const { error: insertError } = await supabase
          .from("track_info")
          .insert({
            race_id: raceId,
            [updateField]: imageData.id,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Imagem carregada!",
        description: "A imagem foi carregada com sucesso.",
      });

      fetchInfo();
    } catch (error: any) {
      toast({
        title: "Erro ao carregar imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "weather" | "map" | "tempChart" | "precipChart"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Ficheiro inválido",
          description: "Por favor seleciona uma imagem.",
          variant: "destructive",
        });
        return;
      }
      handleUpload(file, type);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Weather Card */}
      <div className="card-racing p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            <h3 className="font-racing text-sm uppercase tracking-wider">Previsão do Tempo</h3>
          </div>
          {user && raceId && (
            <Button
              onClick={() => weatherInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading === "weather"}
            >
              {uploading === "weather" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  {info?.weather_image?.url ? "Substituir" : "Carregar"}
                </>
              )}
            </Button>
          )}
          <input
            ref={weatherInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "weather")}
          />
        </div>
        {info?.weather_image?.url ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() =>
                setExpandedImage({
                  url: info.weather_image!.url,
                  title: "Previsão do Tempo",
                })
              }
              className="w-full"
            >
              <img
                src={info.weather_image.url}
                alt={info.weather_image.description || "Weather forecast"}
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg cursor-zoom-in transition-transform hover:scale-[1.01]"
              />
            </button>
            {info.weather_description && (
              <p className="text-sm text-muted-foreground">{info.weather_description}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem informação disponível</p>
        )}
      </div>

      {/* Track Map Card */}
      <div className="card-racing p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-primary" />
            <h3 className="font-racing text-sm uppercase tracking-wider">Mapa da Pista</h3>
          </div>
          {user && raceId && (
            <Button
              onClick={() => mapInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading === "map"}
            >
              {uploading === "map" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  A carregar...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  {info?.track_map?.url ? "Substituir" : "Carregar"}
                </>
              )}
            </Button>
          )}
          <input
            ref={mapInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "map")}
          />
        </div>
        {info?.track_map?.url ? (
          <button
            type="button"
            onClick={() =>
              setExpandedImage({
                url: info.track_map!.url,
                title: "Mapa da Pista",
              })
            }
            className="w-full"
          >
            <img
              src={info.track_map.url}
              alt={info.track_map.description || "Track map"}
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg cursor-zoom-in transition-transform hover:scale-[1.01]"
            />
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Sem mapa disponível</p>
        )}
      </div>

      {/* Temperature chart */}
      <div className="card-racing p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            <h3 className="font-racing text-sm uppercase tracking-wider">Temperaturas</h3>
          </div>
          {user && raceId && (
            <Button
              onClick={() => tempChartInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading === "tempChart"}
            >
              {uploading === "tempChart" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> {info?.temperature_chart_image?.url ? "Substituir" : "Carregar"}</>
              )}
            </Button>
          )}
          <input
            ref={tempChartInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "tempChart")}
          />
        </div>
        {info?.temperature_chart_image?.url ? (
          <button
            type="button"
            onClick={() => setExpandedImage({ url: info.temperature_chart_image!.url, title: "Temperaturas" })}
            className="w-full"
          >
            <img
              src={info.temperature_chart_image.url}
              alt="Gráfico de temperaturas"
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg cursor-zoom-in transition-transform hover:scale-[1.01]"
            />
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Sem gráfico de temperaturas</p>
        )}
      </div>

      {/* Rain and clouds chart */}
      <div className="card-racing p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-primary" />
            <h3 className="font-racing text-sm uppercase tracking-wider">Chuva e Nuvens</h3>
          </div>
          {user && raceId && (
            <Button
              onClick={() => precipChartInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading === "precipChart"}
            >
              {uploading === "precipChart" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> {info?.precip_chart_image?.url ? "Substituir" : "Carregar"}</>
              )}
            </Button>
          )}
          <input
            ref={precipChartInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, "precipChart")}
          />
        </div>
        {info?.precip_chart_image?.url ? (
          <button
            type="button"
            onClick={() => setExpandedImage({ url: info.precip_chart_image!.url, title: "Chuva e Nuvens" })}
            className="w-full"
          >
            <img
              src={info.precip_chart_image.url}
              alt="Gráfico de chuva e nuvens"
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg cursor-zoom-in transition-transform hover:scale-[1.01]"
            />
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Sem gráfico de chuva e nuvens</p>
        )}
      </div>

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              className="relative w-full max-w-[95vw] sm:max-w-3xl md:max-w-5xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute -top-3 -right-3 rounded-full bg-black/80 text-white p-2.5 shadow-lg hover:bg-black min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="rounded-lg bg-black/30 p-2">
                <img
                  src={expandedImage.url}
                  alt={expandedImage.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full max-h-[85vh] object-contain rounded-lg"
                />
              </div>
              <p className="mt-3 text-center text-sm text-white/80">
                {expandedImage.title}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
