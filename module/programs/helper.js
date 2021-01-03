/**
 * name : programs/helper.js
 * author : Akash
 * created-date : 20-Jan-2019
 * Description : Programs helper functionality
 */

// Dependencies
const scopeHelper = require(MODULES_BASE_PATH + "/scope/helper");
const shikshalokamHelper = require(MODULES_BASE_PATH + "/shikshalokam/helper");

/**
    * ProgramsHelper
    * @class
*/
module.exports = class ProgramsHelper {

    /**
   * Programs list.
   * @method
   * @name list
   * @param {Array} [filterQuery = "all"] - filter query data.
   * @param {Array} [fields = "all"] - projected data
   * @param {Array} [skipFields = "none"] - fields to skip
   * @returns {JSON} - Programs list.
   */

  static list(filterQuery = "all" , fields = "all", skipFields = "none") {
    return new Promise(async (resolve, reject) => {
      try {

        let filteredData = {};

        if( filterQuery !== "all" ) {
          filteredData = filterQuery;
        }

        let projection = {};

        if (fields != "all") {
          fields.forEach(element => {
            projection[element] = 1;
          });
        }

        if (skipFields != "none") {
          
          skipFields.forEach(element => {
            projection[element] = 0;
          });
        }
        
        const programs = 
        await database.models.programs.find(
          filteredData, 
          projection
        ).lean();

        return resolve(programs);

      } catch(error) {
        return reject(error);
      }
    })
  }

   /**
   * List of programs.
   * @method
   * @name programDocument
   * @param {Array} [programIds = "all"] - list of programIds.
   * @param {Array} [fields = "all"] -projected data
   * @param {Array} [pageIndex = "all"] - all page index.
   * @param {Array} [pageSize = "all"] - page limit.
   * @returns {JSON} - program document list.
   */

  static programDocument(programIds = "all", fields = "all", pageIndex = "all", pageSize = "all") {

    return new Promise(async (resolve, reject) => {

      try {

        let queryObject = {};

        if (programIds != "all") {
          queryObject = {
            _id: {
              $in: programIds
            }
          };
        }

        let projectionObject = {};

        if (fields != "all") {
          fields.forEach(element => {
            projectionObject[element] = 1;
          });
        }

        let pageIndexValue = 0;
        let limitingValue = 0;

        if (pageIndex != "all" && pageSize !== "all") {
          pageIndexValue = (pageIndex - 1) * pageSize;
          limitingValue = pageSize;
        }

        let programDocuments = await database.models.programs.find(queryObject, projectionObject).skip(pageIndexValue).limit(limitingValue);

        return resolve(programDocuments);

      } catch (error) {

        return reject(error);

      }

    })
  }

   /**
   * Create program
   * @method
   * @name create
   * @param {Array} data 
   * @param {String} userToken
   * @returns {JSON} - create program.
   */

  static create(data,userToken) {

    return new Promise(async (resolve, reject) => {

      try {

        if( userToken && userToken !== "" ) {
          
          let organisationAndRootOrganisation = 
          await shikshalokamHelper.getOrganisationsAndRootOrganisations(
            userToken,
            data.userId
          );

          let createdFor =  organisationAndRootOrganisation.createdFor;
          let rootOrganisations = organisationAndRootOrganisation.rootOrganisations;
          data.createdFor = createdFor;
          data.rootOrganisations = rootOrganisations;
        }

        let programData = {
          "externalId" : data.externalId,
          "name" : data.name,
          "description" : data.description ,
          "owner" : data.userId,
          "createdBy" : data.userId,
          "updatedBy" : data.userId,
          "isDeleted" : false,
          "status" : "active",
          "concepts" : [],
          "createdFor" : data.createdFor,
          "rootOrganisations" : data.rootOrganisations,
          "components" : [],
          "isAPrivateProgram" : data.isAPrivateProgram ? data.isAPrivateProgram : false  
        }

        if( data.resourceType ) {
          programData["resourceType"] = data.resourceType;
        }

        if( data.langugae ) {
          programData["language"] = data.language;
        }

        if( data.keywords ) {
          programData["keywords"] = data.keywords;
        }

        if( data.imageCompression ) {
          programData["imageCompression"] = data.imageCompression;
        }

        let program = await database.models.programs.create(
          programData
        );

        if( !program._id ) {
          throw {
            message : messageConstants.apiResponses.PROGRAM_NOT_CREATED
          };
        }

        if( data.scope ) {

          let programScope = 
          await scopeHelper.addScopeInProgramSolution(
            program._id,
            data.scope
          );

          if( !programScope.success ) {
            return resolve(programScope);
          }
          
        }

        return resolve(program);

      } catch (error) {

        return reject(error);

      }

    })
  }

  /**
   * List of user created programs
   * @method
   * @name userPrivatePrograms
   * @param {String} userId
   * @returns {JSON} - List of programs that user created on app.
   */

  static userPrivatePrograms(userId) {

    return new Promise(async (resolve, reject) => {

      try {

        let programsData = await this.list({
          createdBy : userId,
          isAPrivateProgram : true
        },["name","externalId","description","_id"]);

        if( !programsData.length > 0 ) {
          return resolve({
            message : messageConstants.apiResponses.PROGRAM_NOT_FOUND,
            result : []
          });
        }

        return resolve(programsData);

      } catch (error) {

        return reject(error);

      }

    })
  }

   /**
    * Update program document.
    * @method
    * @name updateProgramDocument
    * @param {Object} query - query to find document
    * @param {Object} updateObject - fields to update
    * @returns {String} - message.
    */

   static updateProgramDocument(query= {}, updateObject= {}) {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.keys(query).length == 0) {
                throw new Error(messageConstants.apiResponses.UPDATE_QUERY_REQUIRED)
            }

            if (Object.keys(updateObject).length == 0) {
                throw new Error (messageConstants.apiResponses.UPDATE_OBJECT_REQUIRED)
            }

            let updateResponse = await database.models.programs.updateOne
            (
                query,
                updateObject
            )
            
            if (updateResponse.nModified == 0) {
                throw new Error(messageConstants.apiResponses.FAILED_TO_UPDATE)
            }

            return resolve({
                success: true,
                message: messageConstants.apiResponses.UPDATED_DOCUMENT_SUCCESSFULLY,
                data: true
            });

        } catch (error) {
            return resolve({
                success: false,
                message: error.message,
                data: false
            });
        }
    });
}

      /**
    * List programs by ids.
    * @method
    * @name listByIds
    * @param {Array} programIds - Program ids. 
    * @returns {Array} List of Programs.
    */

   static listByIds(programIds) {
    return new Promise(async (resolve, reject) => {
        try {

            let programsData;

            if(Array.isArray(programIds) && programIds.length > 0){

              programsData = 
              await this.list({
                _id : { $in : programIds }
              },"all",[
                "components",
                "imageCompression",
                "updatedAt",
                "createdAt",
                "startDate",
                "endDate",
                "updatedBy"
              ]);

              if( !programsData.length > 0 ) {
                throw {
                  status : httpStatusCode["bad_request"].status,
                  message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
                }
              }

            }

            return resolve({
                success: true,
                message: messageConstants.apiResponses.PROGRAM_LIST,
                data: programsData
            });

        } catch (error) {
            return resolve({
                status : error.status ? error.status : httpStatusCode["internal_server_error"].status,
                success: false,
                message: error.message,
                data: false
            });
        }
    });
}

       /**
    * Remove solutions from program.
    * @method
    * @name removeSolutions
    * @param {Array} programId - Program id. 
    * @param {Array} solutionIds - Program id. 
    * @returns {Array} Update program.
    */

   static removeSolutions(programId,solutionIds) {
    return new Promise(async (resolve, reject) => {
        try {

            let programsData = await this.list({_id : programId },["_id"]);

            if( !programsData.length > 0 ) {
              throw {
                status : httpStatusCode["bad_request"].status,
                message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
              }
            }

            let updateSolutionIds = solutionIds.map(solutionId => ObjectId(solutionId));

            let updateSolution = 
            await database.models.programs.findOneAndUpdate({
              _id : programId
            },{
              $pull : {
                components : { $in : updateSolutionIds }
              }
            });

            return resolve({
                success: true,
                message: messageConstants.apiResponses.PROGRAM_UPDATED_SUCCESSFULLY,
                data: updateSolution
            });

        } catch (error) {
            return resolve({
                status : error.status ? error.status : httpStatusCode["internal_server_error"].status,
                success: false,
                message: error.message,
                data: false
            });
        }
    });
   }

   /**
   * Update program
   * @method
   * @name update
   * @param {String} programId - program id.
   * @param {Array} data 
   * @param {String} userId
   * @returns {JSON} - update program.
   */

  static update(programId,data,userId) {

    return new Promise(async (resolve, reject) => {

      try {

        if( Object.keys(_.omit(data,["scope"])).length > 0 ) {
          
          data.updatedBy = userId;
          data.updatedAt = new Date();

          let program = await database.models.programs.findOneAndUpdate({
            _id : programId
          },{ $set : data }, { new: true });

          if( !program._id ) {
            throw {
              message : messageConstants.apiResponses.PROGRAM_NOT_UPDATED
            };
          }
        }

        if( data.scope ) {

          let programScope = 
          await scopeHelper.addScopeInProgramSolution(
            programId,
            data.scope
          );

          if( !programScope.success ) {
            return resolve(programScope);
          }
          
        }

        return resolve({
          success : true,
          message : messageConstants.apiResponses.PROGRAM_UPDATED_SUCCESSFULLY,
          data : {
            _id : programId
          }
        });

      } catch (error) {

        return resolve({
          success : false,
          message : error.message,
          data : {}
        });

      }

    })
  }

};