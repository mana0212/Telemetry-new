let { graphql } = require("@octokit/graphql");
require("dotenv").config();
const Json2csvParser = require("json2csv").Parser;
const fs = require('fs')
const path = require("path");
const write = require("write");

const simpleGit = require("simple-git");
const git = simpleGit();

const hostname = process.env.GHES_HOSTNAME;
const token = process.env.GITHUB_TOKEN;
const enterpriseSlug = process.env.GHE_ENTERPRISE;

const USER = process.env.GIT_USER;
const ORG = process.env.GIT_ORG;
const REPO = process.env.GIT_REPO;
const REPO_PATH = process.env.GIT_REPO_PATH;
var REPO_URL, GHES_HOSTNAME, PASS;


const outputFile = [];
const outputPath = "json_tsv/";


REPO_URL = `${GHES_HOSTNAME}/${ORG}/${REPO}`;

const remote = `https://${USER}:${PASS}@${REPO_URL}`;

const filename = outputFile + ".tsv";
const pathToDestination = path.join(__dirname, `${REPO}${REPO_PATH}`);

const pathToFile = path.join(__dirname, outputPath, filename);
const pathToNewDestination = path.join(pathToDestination, filename);
const gitPath = path.join(__dirname, `${REPO}`);


const graphqlDefaults = {
  baseUrl: `https://${hostname}/api`,
  headers: {
    authorization: `token ${token}`,
  },
};
graphql = graphql.defaults(graphqlDefaults);

var orgquery = {
  query: `query($enterpriseSlug: String!, $cursor: String) {
          enterprise(slug: $enterpriseSlug){
              organizations(first:100 , after:$cursor){
                  nodes{
                      login
                      repositories(first:100){
                          nodes{
                              name
                          }
                      }
                  }
                  pageInfo{
                      endCursor
                      hasNextPage
                    }
              }
          }                   
      } `,
  _queryname: 'orgquery',
  enterpriseSlug: `${enterpriseSlug}`
};

var filequery = {
  query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
        object(expression: "HEAD:") {
        # Top-level.
        ... on Tree {
        entries {
        name
        type
        object {
        ... on Blob {
        byteSize
        }

        # One level down.
        ... on Tree {
        entries {
        name
        type
        object {
        ... on Blob {
        byteSize
        }
        # One level down.
        ... on Tree {
        entries {
        name
        type
        object {
        ... on Blob {
        byteSize
        }
        # One level down.
        ... on Tree {
        entries {
        name
        type
        object {
        ... on Blob {
        byteSize
        }
        # One level down.
        ... on Tree {
        entries {
        name
        type
        object {
        ... on Blob {
        byteSize
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }
        }


    `,
  _queryname: 'filequery'
};

var commitquery = {
  query: `query($owner: String!, $name: String!, $path: String) {
    repository(owner:$owner, name:$name) {
    defaultBranchRef {
    target {
    ... on Commit {
    history(first: 10, path: $path) {
    totalCount
    nodes {
    committedDate
      commitUrl
      
    }
    }
    }
    }
    }
    }
    }`,
  _queryname: 'commitquery'
}

async function getOrgsRepos() {
  try {
    var orgarraylogin = []
    tableData = []
    var reponame = []
    hasNext = true
   //while(hasNext){
    var result = await graphql(orgquery);
    var l = JSON.parse(JSON.stringify(result)).enterprise.organizations.nodes.length;
    orgquery.cursor = result.enterprise.organizations.pageInfo.endCursor;
    var hasNext = JSON.parse(JSON.stringify(result)).enterprise.organizations.pageInfo.hasNextPage
    for (i = 0; i < 10; i++) {
      orgarraylogin.push(result.enterprise.organizations.nodes[i].login)
      var r = JSON.parse(JSON.stringify(result)).enterprise.organizations.nodes[i].repositories.nodes.length
      for (j = 0; j < r; j++) {
        var repo = result.enterprise.organizations.nodes[i].repositories.nodes[j].name;
        tableData.push({
          OrgName: orgarraylogin[i],
          RepoName: repo
        })
      }

    }
 // }
  //console.log(tableData)
return tableData;
  }

  catch (error) {
    console.log("Request failed:", error);
  }


}

async function filepath(filequery) {
  var filearray = [];
  var tableData;
  tableData = await getOrgsRepos(orgquery);
  for (var k = 0; k < 10; k++) {
    filequery.owner = tableData[k].OrgName;
    filequery.name = tableData[k].RepoName;
    var response = await graphql(filequery);
    var l = response.repository.object.entries.length;
    for (let i = 0; i < l; i++) {
      if (response.repository.object.entries[i].type == "tree") {
        //console.log(response.repository.object.entries[i].type);        console.log(response.repository.object.entries[i].object.entries.length);
        for (let j = 0; j < response.repository.object.entries[i].object.entries.length; j++) {
          // console.log(j);
          if (response.repository.object.entries[i].object.entries[j].type == "blob") {
            //console.log(response.repository.object.entries[i].object.entries[j].type);               
            const filepath = response.repository.object.entries[i].name + '/' + response.repository.object.entries[i].object.entries[j].name
            //console.log(filepath);               
            filearray.push(filepath);
          }
          if (response.repository.object.entries[i].object.entries[j].type == "tree") {
            for (let k = 0; k < response.repository.object.entries[i].object.entries[j].object.entries.length; k++) {
              if (response.repository.object.entries[i].object.entries[j].object.entries[k].type == "blob") {
                //console.log(response.repository.object.entries[i].object.entries[j].object.entries[k].type);                        console.log("secondlevel");
                const newfilepath = response.repository.object.entries[i].name + '/' + response.repository.object.entries[i].object.entries[j].name + '/' + response.repository.object.entries[i].object.entries[j].object.entries[k].name;
                filearray.push(newfilepath)
              }
              if (response.repository.object.entries[i].object.entries[j].object.entries[k].type == "tree") {
                for (let l = 0; l < response.repository.object.entries[i].object.entries[j].object.entries[k].object.entries.length; l++) {
                  if (response.repository.object.entries[i].object.entries[j].object.entries[k].object.entries[l].type == "blob") {
                    const secondfilepath = response.repository.object.entries[i].name + '/' + response.repository.object.entries[i].object.entries[j].name + '/' + response.repository.object.entries[i].object.entries[j].object.entries[k].name + '/' + response.repository.object.entries[i].object.entries[j].object.entries[k].object.entries[l].name;
                    filearray.push(secondfilepath);
                  }
                
                }
              }

            }
          }
          continue;
        }
      } else {
        filearray.push(response.repository.object.entries[i].name);
      }
    }
    var filesData = [];
    commitquery.owner = tableData[k].OrgName;
    commitquery.name = tableData[k].RepoName;
    for (var f = 0; f < filearray.length; f++) {
      commitquery.path = filearray[f];
      var result = await graphql(commitquery);
      var totalCount = result.repository.defaultBranchRef.target.history.totalCount
     // console.log(commitquery.path + totalCount);
      var r = result.repository.defaultBranchRef.target.history.nodes.length;
      for (var i = 0; i < r; i++) {
        if (result.repository.defaultBranchRef.target.history.nodes[i].committedDate != null) {
          var commitdatearray = result.repository.defaultBranchRef.target.history.nodes[i].committedDate;

        }

      }

      filesData.push({
        OrgName: tableData[k].OrgName,
        Repository: tableData[k].RepoName,
        FileName: filearray[f],
       // commitdate: commitdatearray,
        CommitCount: totalCount

      })
    // console.log(filesData);

    }
  }

  var fields = ['OrgName', 'Repository', 'FileName', 'CommitCount'];
  var json2csvParser = new Json2csvParser({
    fields,
    delimiter: "\t",
  });

  var data = json2csvParser.parse(filesData);
  outputFile.push("files_data_orgs");
  write.sync(outputPath + outputFile[0] + ".tsv", data, { newline: true });

}



filepath(filequery);
