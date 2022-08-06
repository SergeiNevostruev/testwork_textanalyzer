import * as Hapi from "@hapi/hapi";
import boom from "@hapi/boom";
import handlers from "./handlers";
import { RequestUrlType } from "../../types";
import { rm } from "fs";
import path from "path";
import { pathDir } from "../../..";
import config from "../config";
const { pdfCreater, getHtmlAndConvertToText, textAnalyzer } = handlers;

const parse: Hapi.Lifecycle.Method = async (request, h) => {
  console.log("Прилетел запрос parse");
  return "parse";
};

const file: Hapi.Lifecycle.Method = async (request, h) => {
  const { payload } = request;
  const { url } = payload as { url: RequestUrlType };
  // console.log(url);
  const textData = await getHtmlAndConvertToText(url);
  const textForPDF = [];
  let threeWords: string;
  try {
    for (const text of textData) {
      threeWords = (await textAnalyzer(text.data)).join(" | ");
      textForPDF.push({ url: text.url, words: threeWords });
    }

    console.log("Прилетел запрос file");
    const dataFile = await pdfCreater(textForPDF).catch(() => ({
      done: false,
      fileName: "",
    }));
    if (dataFile.done) {
      const { fileName } = dataFile;
      if (config.deleteFile) {
        setTimeout(() => {
          rm(path.join(pathDir, fileName), () => {
            console.log(fileName, "был удален");
          });
        }, config.deleteFileTimeOut);
      }
      return h.file(fileName, {});
    } else {
      return boom.serverUnavailable("Не удалось записать PDF файл");
    }
  } catch (error) {
    return boom.serverUnavailable("Неизвестная ошибка");
  }
};

export default { parse, file };
