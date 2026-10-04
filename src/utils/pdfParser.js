import * as pdfjsLib from "pdfjs-dist";

// Configure worker - use worker from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * Parse a PDF file containing championship standings
 * Expected format: RANK +/- NO. CAR TEAM POINTS BEHIND STARTS POLES WINS TOP5 TOP10
 */
export async function parsePdfToStandings(file) {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      text += pageText + "\n";
    }

    // Detect class from filename or content
    let detectedClass = null;
    if (
      text.includes("GT PRO") ||
      text.includes("GT3 PRO") ||
      file.name.includes("GT PRO")
    ) {
      detectedClass = "GT3 PRO";
    } else if (text.includes("LMP2") || file.name.includes("LMP2")) {
      detectedClass = "LMP2";
    }

    // Extract standings from text
    const standings = extractStandingsFromText(text);

    return {
      standings,
      detectedClass,
      rawText: text,
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error(
      `Falha ao processar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    );
  }
}

/**
 * Extract standings data from parsed PDF text
 */
function extractStandingsFromText(text) {
  const standings = [];
  // The PDF text comes as a continuous stream of words
  // We need to find patterns like: number +/- number teamname number number...
  // Split by common separators and clean up
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  // Find where the data starts (after "TOP10" header)
  let startIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "TOP10") {
      startIndex = i + 1;
      break;
    }
  }
  if (startIndex === -1) {
    console.error("Could not find TOP10 header");
    throw new Error(
      "Formato de PDF não reconhecido: cabeçalho da tabela não encontrado",
    );
  }
  // Parse data starting from after the header
  let i = startIndex;
  while (i < words.length) {
    // Check if we've reached the end of data
    if (
      words[i].includes("SportsCar") ||
      (words[i].includes("Points") && words[i + 1] === "System")
    ) {
      break;
    }
    // Try to parse a standing entry
    const result = parseStandingFromWords(words, i);
    if (result) {
      standings.push(result.standing);
      i = result.nextIndex;
    } else {
      i++;
    }
  }
  if (standings.length === 0) {
    console.error("No standings found in parsed words");
    throw new Error("Nenhum dado de classificação encontrado no PDF");
  }
  return standings;
}

/**
 * Parse standing data from word array starting at given index
 * Returns the parsed standing and the next index to continue from
 */
function parseStandingFromWords(words, startIndex) {
  try {
    let i = startIndex;
    // 1. Rank (number)
    const rank = parseInt(words[i]);
    if (isNaN(rank) || rank < 1) {
      return null;
    }
    i++;
    // 2. +/- (can be number, "new", "--", or other)
    // Just skip it
    i++;
    // 3. Car number
    const car_number = words[i];
    i++;
    // 4. Team name - collect words until we hit 7 consecutive numbers
    const teamNameWords = [];
    while (i < words.length) {
      // Check if the next 7 words are all numbers (the stats)
      if (i + 6 < words.length) {
        const next7 = words.slice(i, i + 7);
        const allNums = next7.every((w) => !isNaN(parseInt(w)));
        if (allNums) {
          // Found the stats, stop collecting team name
          break;
        }
      }
      teamNameWords.push(words[i]);
      i++;
      // Safety: don't collect more than 10 words for team name
      if (teamNameWords.length > 10) {
        return null;
      }
    }
    if (teamNameWords.length === 0) {
      return null;
    }
    const team_name = teamNameWords.join(" ");
    // 5-11. Stats (7 numbers: points, behind, starts, poles, wins, top5, top10)
    if (i + 6 >= words.length) {
      return null;
    }
    const points = parseInt(words[i++]);
    const behind = parseInt(words[i++]);
    const starts = parseInt(words[i++]);
    const poles = parseInt(words[i++]);
    const wins = parseInt(words[i++]);
    const top5 = parseInt(words[i++]);
    const top10 = parseInt(words[i++]);
    // Validate all numbers
    if (
      isNaN(points) ||
      isNaN(behind) ||
      isNaN(starts) ||
      isNaN(poles) ||
      isNaN(wins) ||
      isNaN(top5) ||
      isNaN(top10)
    ) {
      return null;
    }
    return {
      standing: {
        rank,
        car_number,
        team_name,
        points,
        behind,
        starts,
        poles,
        wins,
        top5,
        top10,
      },
      nextIndex: i,
    };
  } catch (error) {
    console.warn("Failed to parse from index", startIndex, error);
    return null;
  }
}
