//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721{
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
     ) external;
}   

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;

    modifier  onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyBuyer(uint256 _nftID){
        require(msg.sender == buyer[_nftID], "Only buyer can call this method");
        _;
    }

    modifier onlyInspector(){
        require(msg.sender == inspector, "Only inspector can call this method");
        _;
    }

    mapping (uint256 => bool)    public isListed;
    mapping (uint256 => uint256) public purchasePrice;
    mapping (uint256 => uint256) public escrowAmount;
    mapping (uint256 => address) public buyer;
    mapping (uint256 => bool)    public inspectionPassed;
    mapping (uint256 => mapping (address => bool)) public approval;

    constructor(address _nftAddress, 
                address payable _seller, 
                address _inspector, 
                address _lender){
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function list(
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address _buyer
        )
         public payable onlySeller {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        isListed[_nftID] = true;
        buyer[_nftID] = _buyer;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;

    }

    // Put Under Contract (only buyer - payable escrow)
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID){
        require(msg.value >= escrowAmount[_nftID]);
    }

    // Update Inspection status (only inspector)
    function updateInspectionStatus(uint256 _nftID, bool _passed) public onlyInspector{
        inspectionPassed[_nftID] = _passed;
    }

    // Approve Sale
    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }


    receive() external payable{}

    function getBalance() public view returns (uint256){
        return address(this).balance;
    }

    // Finalize Sale
    // Require inspection status
    // Require sale to be authorized
    // Require funds to be correct amount
    // Transfer NFT to buyer
    // Trasnfer funds to Seller
    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID]);
        require(approval[_nftID][buyer[_nftID]]);
        require(approval[_nftID][seller]);
        require(approval[_nftID][lender]);        
        require(address(this).balance >= purchasePrice[_nftID]);

        isListed[_nftID] = false;

        (bool success, ) = payable(seller).call{ value:address(this).balance}("");
        require(success);

        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);
    }


    // Cancel sale (handle earned deposit)
    // if inspection.status is not approved then refund o.w. send to seller
    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false){
            payable(buyer[_nftID]).transfer(address(this).balance);
        }else{
            payable(seller).transfer(address(this).balance);
        }
    }


}
