import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { pathDir } from "../../..";
import { DataTextType, RequestUrlType } from "../../types";
import axios from "axios";
import { convert, HtmlToTextOptions } from "html-to-text";
import natural from "natural";
// @ts-ignore
import Az from "az";
import config from "../config";

const pdfCreater = (
  data: Array<{
    url: string;
    words: string;
  }>
): Promise<{ done: boolean; fileName: string }> =>
  new Promise((resolve, reject) => {
    const fileName = uuidv4() + ".pdf";
    console.log(fileName);

    const filePath = path.join(pathDir, fileName);
    const pdfDoc = new PDFDocument();
    const stream = pdfDoc.pipe(fs.createWriteStream(filePath));

    for (const item of data) {
      pdfDoc.font("fonts/Roboto-Medium.ttf").fillColor("blue").text(item.url);
      pdfDoc
        .font("fonts/Roboto-Medium.ttf")
        .fillColor("black")
        .text(item.words, { paragraphGap: 10 });
    }

    pdfDoc.end();
    stream.on("finish", () => {
      resolve({ done: true, fileName });
    });
    stream.on("error", (e) => {
      console.log(e);
      reject({ done: false, fileName: "" });
    });
  });

const getHtmlAndConvertToText = async (data: RequestUrlType) => {
  const option: HtmlToTextOptions = {
    baseElements: {
      selectors: config.parsingTegs,
      returnDomByDefault: true,
    },
  };
  const dataArray: Array<{ url: string; data: string }> = [];
  for (const url of data) {
    let head = await axios.request({ method: "HEAD", url: url }).catch();
    const contentType = head.headers["content-type"].split("; ")[0];
    if (contentType === "text/html") {
      let res = await axios.get(url);
      dataArray.push({ url, data: convert(res.data, option) });
    }
  }
  return dataArray;
};

const normalWords = (text: string[]) => {
  const words: string[] = [];
  let parses: any;
  let latin: boolean;
  return new Promise((resolve, reject) => {
    Az.Morph.init("node_modules/az/dicts", function () {
      for (const word of text) {
        parses = Az.Morph(word, { typos: "auto" });
        latin = parses[0].parser === "Latin";
        latin
          ? words.push(word.toLowerCase())
          : words.push(parses[0].normalize().word);
      }
      resolve(words);
    });
  });
};

const textAnalyzer = async (data: string) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(data).filter((v) => v.length > 3);
  const stem = tokens.map((v) => ({
    initial: v,
    stem: natural.PorterStemmerRu.stem(v),
  }));
  const stemAndCount = stem
    .map((v, i, arr) => ({
      initial: v.initial,
      stem: v.stem,
      count: arr.filter((valArr) => valArr.stem === v.stem).length,
    }))
    .sort((a, b) => b.count - a.count);

  const stemThreeWords = [
    stemAndCount[0].initial,
    stemAndCount[stemAndCount[0].count + 1].initial,
    stemAndCount[
      stemAndCount[0].count +
        1 +
        stemAndCount[stemAndCount[0].count + 1].count +
        1
    ].initial,
  ];

  const normalhreeWords = (await normalWords(stemThreeWords)) as string[];

  return normalhreeWords;
};

export default { pdfCreater, getHtmlAndConvertToText, textAnalyzer };
